#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TEST: Redsys Callback
#
# Genera parámetros Redsys firmados (con Python) y hace POST con curl.
#
# USO:
#   # Directamente contra la API local (sin ngrok):
#   ./tests/redsys-callback.sh
#
#   # Contra ngrok (tunnel activo):
#   TARGET_URL=https://ungraved-intercoracoid-christoper.ngrok-free.dev ./tests/redsys-callback.sh
#
#   # Con datos personalizados:
#   ORDER_ID=260507120408 AMOUNT=4784 ./tests/redsys-callback.sh
#
# VARIABLES:
#   TARGET_URL        URL base del servidor (default: http://localhost:3000)
#   ORDER_ID          providerId del pedido en la BD
#   AMOUNT            importe en céntimos (ej: 4784 = 47.84 EUR)
#   DS_RESPONSE       código de respuesta Redsys (0000 = autorizado, 0101 = denegado)
#   REDSYS_SECRET_KEY secretKey de Redsys en Base64 (sandbox: sq7HjrUOBfKmC576ILgskD5srU870gJ7)
# ─────────────────────────────────────────────────────────────────────────────
TARGET_URL="${TARGET_URL:-http://localhost:3000}"
NGROK_URL="${NGROK_URL:-https://ungraved-intercoracoid-christoper.ngrok-free.dev}"
CALLBACK_PATH="/api/v1/payment/callback"
ORDER_ID="${ORDER_ID:-778220307559}"
AMOUNT="${AMOUNT:-253.81}"
DS_RESPONSE="${DS_RESPONSE:-0000}"
SECRET_KEY="${REDSYS_SECRET_KEY:-sq7HjrUOBfKmC576ILgskD5srU870gJ7}"

# ─── Generar MerchantParameters y Firma con Python ───────────────────────────
read -r -d '' PYTHON_SCRIPT << 'PYTHON' || true
import sys, json, base64, hmac, hashlib, struct, datetime

secret_b64 = sys.argv[1]
order_id   = sys.argv[2]
amount     = sys.argv[3]
response   = sys.argv[4]

now = datetime.datetime.now()

params = {
    "Ds_Date":             now.strftime("%d/%m/%Y"),
    "Ds_Hour":             now.strftime("%H:%M"),
    "Ds_Amount":           amount,
    "Ds_Currency":         "978",
    "Ds_Order":            order_id,
    "Ds_MerchantCode":     "999008881",
    "Ds_Terminal":         "1",
    "Ds_Response":         response,
    "Ds_TransactionType":  "0",
    "Ds_SecurePayment":    "1",
    "Ds_AuthorisationCode": "123456",
}

merchant_params_b64 = base64.b64encode(json.dumps(params, separators=(',',':')).encode()).decode()

# 3DES-CBC
key = base64.b64decode(secret_b64)
order_bytes = order_id.encode('utf-8')
block_size = 8
padded_len = ((len(order_bytes) + block_size - 1) // block_size) * block_size
order_padded = order_bytes.ljust(padded_len, b'\x00')

try:
    from Crypto.Cipher import DES3
    iv = b'\x00' * 8
    cipher = DES3.new(key, DES3.MODE_CBC, iv)
    key_order = cipher.encrypt(order_padded)
except ImportError:
    # Fallback sin pycryptodome: usa openssl via subprocess
    import subprocess, tempfile, os
    with tempfile.NamedTemporaryFile(delete=False) as kf:
        kf.write(key)
        kf_path = kf.name
    with tempfile.NamedTemporaryFile(delete=False) as df:
        df.write(order_padded)
        df_path = df.name
    result = subprocess.run(
        ['openssl', 'enc', '-des-ede3-cbc', '-nosalt', '-nopad',
         '-K', key.hex(), '-iv', '0000000000000000', '-in', df_path],
        capture_output=True
    )
    key_order = result.stdout
    os.unlink(kf_path)
    os.unlink(df_path)

sig_bytes = hmac.new(key_order, merchant_params_b64.encode(), hashlib.sha256).digest()
sig_b64url = base64.b64encode(sig_bytes).decode().replace('+','-').replace('/','_').rstrip('=')

print(merchant_params_b64)
print(sig_b64url)
PYTHON

OUTPUT=$(python3 -c "$PYTHON_SCRIPT" "$SECRET_KEY" "$ORDER_ID" "$AMOUNT" "$DS_RESPONSE")
MERCHANT_PARAMS=$(echo "$OUTPUT" | head -1)
SIGNATURE=$(echo "$OUTPUT" | tail -1)

AMOUNT_EUR=$(python3 -c "print(f'{float(\"$AMOUNT\")/100:.2f}')")

do_post() {
  local url="$1"
  local full_url="${url}${CALLBACK_PATH}"

  echo ""
  echo "──────────────────────────────────────────────────────"
  echo "  POST ${full_url}"
  echo "  Ds_Order      : ${ORDER_ID}"
  echo "  Ds_Amount     : ${AMOUNT} céntimos → ${AMOUNT_EUR} EUR"
  echo "  Ds_Response   : ${DS_RESPONSE} $([ "$DS_RESPONSE" = "0000" ] && echo "(AUTORIZADO ✅)" || echo "(DENEGADO ❌)")"
  echo "  Signature     : ${SIGNATURE}"
  echo "──────────────────────────────────────────────────────"
  echo ""

  HTTP_CODE=$(curl -s -o /tmp/redsys_cb_response.txt -w "%{http_code}" \
    -X POST "${full_url}" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "ngrok-skip-browser-warning: 1" \
    --max-time 10 \
    --data-urlencode "Ds_SignatureVersion=HMAC_SHA256_V1" \
    --data-urlencode "Ds_MerchantParameters=${MERCHANT_PARAMS}" \
    --data-urlencode "Ds_Signature=${SIGNATURE}")

  RESPONSE=$(cat /tmp/redsys_cb_response.txt)

  echo "  HTTP Status : ${HTTP_CODE}"
  echo "  Response    : ${RESPONSE}"
  echo "──────────────────────────────────────────────────────"
  echo ""

  if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅  Callback procesado correctamente"
  elif [ "$HTTP_CODE" = "500" ]; then
    echo "  ⚠️   HTTP 500 — la firma no coincide con la BD o el ORDER_ID no existe"
    echo "      → Ajusta REDSYS_SECRET_KEY y ORDER_ID a los valores reales de la BD"
  elif [ "$HTTP_CODE" = "404" ]; then
    echo "  ❌  HTTP 404 — ruta no encontrada"
    echo "      → Comprueba que la API está corriendo en ${url}"
  elif [ "$HTTP_CODE" = "000" ]; then
    echo "  ❌  Sin conexión — no se pudo contactar con ${url}"
  elif [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "308" ]; then
    echo "  ❌  Tunnel inactivo (HTTP ${HTTP_CODE}) — ngrok redirige a otro destino"
    echo "      → Arranca ngrok: ngrok http 3000"
  else
    echo "  ❌  HTTP ${HTTP_CODE}"
  fi

  echo ""
}

# ── 1. Localhost (API directa) ─────────────────────────────────────────────
echo "▶  LOCAL"
do_post "$TARGET_URL"

# ── 2. Ngrok (tunnel público) ──────────────────────────────────────────────
echo "▶  NGROK"
do_post "$NGROK_URL"



