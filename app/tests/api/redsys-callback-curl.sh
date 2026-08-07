#!/usr/bin/env bash
set -euo pipefail

# Test rápido del callback de Redsys con curl.
# Permite detectar bloqueos en Cloudflare/WAF mostrando status y cabeceras.
#
# Uso:
#   ./app/tests/api/redsys-callback-curl.sh --host 1
#   ./app/tests/api/redsys-callback-curl.sh --host 2
#
# Variables opcionales:
#   DS_SIGNATURE_VERSION
#   DS_MERCHANT_PARAMETERS
#   DS_SIGNATURE
#   REQUEST_TIMEOUT
#   USER_AGENT
#   INSECURE_SSL=true

usage() {
  cat <<'EOF'
Uso:
  ./app/tests/api/redsys-callback-curl.sh --host <1|2>

Hosts:
  1 -> https://api-clients-callback-checkout.informaticaautonomos.com/api/v1/payment/callback
  2 -> https://api-checkout.informaticaautonomos.com/api/v1/payment/callback
EOF
}

if [[ "${1:-}" != "--host" || -z "${2:-}" ]]; then
  usage
  exit 1
fi

HOST_OPTION="$2"
case "$HOST_OPTION" in
  1)
    CALLBACK_URL="https://api-clients-callback-checkout.informaticaautonomos.com/api/v1/payment/callback"
    ;;
  2)
    CALLBACK_URL="https://api-checkout.informaticaautonomos.com/api/v1/payment/callback"
    ;;
  *)
    echo "Error: host inválido '$HOST_OPTION'. Usa 1 o 2." >&2
    usage
    exit 1
    ;;
esac

DS_SIGNATURE_VERSION="${DS_SIGNATURE_VERSION:-HMAC_SHA256_V1}"
DS_MERCHANT_PARAMETERS="${DS_MERCHANT_PARAMETERS:-eyJEc19NZXJjaGFudENvZGUiOiIzMzc5NjYzMDMiLCJEc19UZXJtaW5hbCI6IjAwMSIsIkRzX09yZGVyIjoiNzg1OTIyNjg2OTQyIiwiRHNfQW1vdW50IjoiMjgiLCJEc19DdXJyZW5jeSI6Ijk3OCIsIkRzX0RhdGUiOiIwNVwvMDhcLzIwMjYiLCJEc19Ib3VyIjoiMTE6MzgiLCJEc19TZWN1cmVQYXltZW50IjoiMSIsIkRzX1Jlc3BvbnNlIjoiMDAwMCIsIkRzX01lcmNoYW50RGF0YSI6IiIsIkRzX1RyYW5zYWN0aW9uVHlwZSI6IjAiLCJEc19Db25zdW1lckxhbmd1YWdlIjoiMSIsIkRzX0F1dGhvcmlzYXRpb25Db2RlIjoiMjgxNTMxIiwiRHNfQml6dW1fQ3VlbnRhVHJ1bmNhZGEiOiJFUzYyWFhYWFhYWFhYWFhYWFhYWDI3OTkiLCJEc19CaXp1bV9Nb2JpbGVOdW1iZXIiOiIzNDZYWFhYWDIwMyIsIkRzX0JpenVtX0lkT3BlciI6IjgzNTUyNDMyMDk0OTY5Njk5ODczMzI2Mzk4MTAwODEwMTA1IiwiRHNfUHJvY2Vzc2VkUGF5TWV0aG9kIjoiNjgifQ==}"
DS_SIGNATURE="${DS_SIGNATURE:-nfldjgVmQRi_Ew6gnZl1WtTVK4Vo4aE9W3tNJD3EGdg=}"
REQUEST_TIMEOUT="${REQUEST_TIMEOUT:-20}"
USER_AGENT="${USER_AGENT:-Redsys-Callback-Test/1.0}"

headers_file="$(mktemp)"
body_file="$(mktemp)"
trap 'rm -f "$headers_file" "$body_file"' EXIT

curl_args=(
  --silent
  --show-error
  --location
  --max-time "$REQUEST_TIMEOUT"
  --request POST "$CALLBACK_URL"
  --header "Content-Type: application/x-www-form-urlencoded"
  --header "User-Agent: $USER_AGENT"
  --header "ngrok-skip-browser-warning: 1"
  --data-urlencode "Ds_SignatureVersion=$DS_SIGNATURE_VERSION"
  --data-urlencode "Ds_MerchantParameters=$DS_MERCHANT_PARAMETERS"
  --data-urlencode "Ds_Signature=$DS_SIGNATURE"
  --dump-header "$headers_file"
  --output "$body_file"
  --write-out "%{http_code}"
)

if [[ "${INSECURE_SSL:-false}" == "true" ]]; then
  curl_args+=(--insecure)
fi

echo "==> Host option: $HOST_OPTION"
echo "==> POST $CALLBACK_URL"
http_code="$(curl "${curl_args[@]}")"

echo ""
echo "HTTP status: $http_code"
echo ""
echo "Response headers:"
cat "$headers_file"
echo ""
echo "Response body:"
cat "$body_file"
echo ""

echo "Cloudflare hints:"
grep -iE '^(server:|cf-ray:|cf-cache-status:|cf-mitigated:|nel:|report-to:)' "$headers_file" || echo "(sin cabeceras Cloudflare detectables)"

if [[ "$http_code" == "403" ]]; then
  echo ""
  echo "Diagnóstico: 403 detectado. Si ves cf-ray/server: cloudflare, el bloqueo ocurre en Cloudflare (WAF/Bot/Rate Limit) antes de llegar a ia-api."
fi
