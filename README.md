# IA-API

Tech NodeJs

* API
* MySQL
  * Tables: users, orders, addresses, paymentMethods,userConfig
* Redis stream
* worker with docker. 



## Endpoints
* http://localhost:3000/api/v1/user/1


### Admin API (`/api/v1/admin/*`)
All routes require the signed identity sent by ia-website. `IA_ADMIN_SHARED_SECRET` must have the
**same value in ia-api and ia-website**; if it is missing or different, every admin call (preferences,
shipping, payment methods, orders, profile, signing keys) is rejected — fail closed.

* `x-ia-admin-email`, `x-ia-admin-timestamp` (Unix seconds, ±300 s), `x-ia-admin-signature`
* signature = hex HMAC-SHA256(`timestamp + "\n" + email + "\n" + METHOD + "\n" + pathname`)
* any `email` in query/body must equal the signed email; orders/domains are filtered by that owner.
* The body is not signed: a captured request can be replayed within the 5-minute window, so keep
  ia-website → ia-api traffic on the internal network.

### Per-domain HMAC signing keys
Table `domainSigningKeys` (`unique(domainId, purpose)`, purpose `cart` | `callback`). Secrets are 32 random
bytes (base64url); HMAC uses the UTF-8 bytes of that string. They are stored encrypted with
AES-256-GCM using `HMAC_ENCRYPTION_SECRET`, which is needed only to generate or read keys.

* **Legacy mode:** a domain with no key (or `enabled=false`) is not required to sign. **Its cart prices
  are NOT protected** against browser tampering and its callbacks are unauthenticated.
* If a key exists and `HMAC_ENCRYPTION_SECRET` is missing or wrong, reading it throws (never legacy).

Endpoints (secrets are never listed; the generated one is returned once with `Cache-Control: no-store`):

* `GET /api/v1/admin/signing-keys`
* `POST /api/v1/admin/signing-keys/:domainId/:purpose/generate` — body `{ graceSeconds?: 300 | 600…604800 }`.
  On rotation the old key stays valid for that window; a second rotation while it is still valid returns 409.
* `PUT /api/v1/admin/signing-keys/:domainId/:purpose/enabled` — body `{ enabled: boolean }` (requires a key)
* `POST /api/v1/admin/signing-keys/:domainId/:purpose/retire-previous`

Core access: `await new SigningKeys().find(domainId, 'cart' | 'callback')` (`src/services/security/SigningKeys.ts`).

`cartAuthorizations.orderId` links a signed cart attempt to `userPaymentOrders.id` once the
order is saved, before queuing the callback. It is nullable while no order exists and becomes
null if the order is deleted. Migration `20261117100000-cart-authorization-order` backfills
historical rows only when the snapshot provider ID and domain identify exactly one order;
check its warning and reconcile any unmatched or ambiguous rows manually.

### Deployment order
1. Run the migrations (`20261113120000-domainSigningKeys`, `20261113130000-cart-authorizations`
   and `20261117100000-cart-authorization-order`) **before** deploying the new code.
2. Set `HMAC_ENCRYPTION_SECRET` (ia-api) and the same `IA_ADMIN_SHARED_SECRET` in ia-api and ia-website
   (`openssl rand -base64 48`), then deploy both together.
3. Generate keys in the panel, install them on the shop server, and only then enable "Require signature".
4. Worker events: `REDIS_MESSAGE_EXPIRATION_MS=86400000` (24 h). Expired/failed events go to
   `default_stream:dead` and must be reconciled manually.

### Local HTTPS with mkcert
Docker Compose loads `app/.env` into API and worker before Node starts. For callbacks to a local
shop using mkcert, copy only its public `rootCA.pem` to
`app/node_modules/.cache/ia-local-rootCA.pem` and set
`NODE_EXTRA_CA_CERTS=/usr/src/app/node_modules/.cache/ia-local-rootCA.pem` in `app/.env`.
Recreate API and worker after changing this setting; loading it later through dotenv is too late.
Never copy `rootCA-key.pem` or disable TLS verification. Single-quote existing `.env` values
containing `$` so Compose does not interpolate them and change encryption secrets.

`CALLBACK_HOST` must be reachable by the payment provider. A hostname resolving through local
`/etc/hosts` works only locally; external Redsys sandbox notifications need a public HTTPS tunnel
pointing to the local API.

### Payment Methods Overview
| Payment Method                              | Country / Region | OAuth / Partner App                    | How it works                                                                            | Multi-Merchant Support         | Tokenization                       | Notes                                                  |
| ------------------------------------------- | ---------------- | -------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------- | ------------------------------------------------------ |
| **PayPal**                                  | Worldwide        | Yes (Partner / Platform OAuth Connect) | Merchant authorizes the app, backend obtains access_token/refresh_token, creates orders | Yes                            | No                                 | Allows centralized payments for multiple merchants     |
| **Redsys / Virtual POS**                    | Spain            | No                                     | Merchant provides FUC, Terminal ID, and Secret Key; backend signs the order             | Yes, with separate credentials | No                                 | Backend manages each merchant’s credentials            |
| **Klarna**                                  | Europe           | No                                     | Each merchant has a merchant ID and shared secret; backend creates orders via API       | Yes                            | Yes                                | Tokenized checkout, no OAuth                           |
| **Apple Pay**                               | Worldwide        | No (processor-dependent)               | Frontend generates a payment token; backend sends it to the processor                   | Yes, via processor             | Yes                                | Only tokenizes the card                                |
| **Google Pay**                              | Worldwide        | No (processor-dependent)               | Same as Apple Pay                                                                       | Yes, via processor             | Yes                                | Depends on the processor                               |
| **Amazon Pay**                              | US / Europe      | Yes                                    | Merchant configures the app; backend creates orders using credentials                   | Yes                            | No / tokenized depending on method | Similar to PayPal                                      |
| **BNPL (Afterpay, Klarna, Affirm, Sezzle)** | US, Europe       | Partial                                | Merchant creates the order via API; provider manages installment payments               | Yes                            | Yes                                | Each provider has its own APIs                         |
| **iDEAL**                                   | Netherlands      | No                                     | Customer pays via their online bank                                                     | Yes, with merchant credentials | No                                 | Requires bank integration                              |
| **Bancontact**                              | Belgium          | No                                     | Customer pays via their local bank                                                      | Yes                            | No                                 | Widely used in Belgium                                 |
| **Sofort / Klarna**                         | Germany, Austria | No                                     | Customer pays via online banking; backend receives confirmation                         | Yes                            | No                                 | Popular in German e-commerce                           |
| **EPS**                                     | Austria          | No                                     | Online banking, payment confirmation sent to backend                                    | Yes                            | No                                 | Similar to Sofort                                      |
| **Przelewy24 (P24)**                        | Poland           | No                                     | Online banking / instant transfer                                                       | Yes                            | No                                 | Popular in Poland                                      |
| **Boleto Bancário**                         | Brazil           | No                                     | Customer pays boleto at a bank or app                                                   | Yes                            | No                                 | Offline payment confirmed to backend                   |
| **PagoFácil / Rapipago**                    | Argentina        | No                                     | Customer pays at physical locations; backend receives confirmation                      | Yes                            | No                                 | Offline payments, useful for regional e-commerce       |
| **Trustly**                                 | Europe           | No                                     | Customer pays directly from their bank                                                  | Yes                            | No                                 | Instant transfers from European banks                  |
| **Giropay**                                 | Germany          | No                                     | Payments through German banks                                                           | Yes                            | No                                 | Similar to iDEAL and Sofort                            |
| **MercadoPago**                             | Latin America    | No                                     | Similar to PayPal; backend uses merchant credentials                                    | Yes                            | Yes                                | Popular in Argentina, Brazil, Mexico                   |
| **Alipay**                                  | China / Asia     | No                                     | Chinese digital wallet; backend creates orders using merchant ID                        | Yes                            | Yes                                | Widely used in China                                   |
| **WeChat Pay**                              | China / Asia     | No                                     | Digital wallet integrated into WeChat                                                   | Yes                            | Yes                                | Widely used in China                                   |
| **Stripe**                                  | Worldwide        | Yes (API keys per merchant)            | Merchant provides API keys; backend creates payments and receives webhooks              | Yes                            | Yes                                | Simplifies card and wallet payments (Apple/Google Pay) |


### Test Redsys
`ngrok http 3000`

* Test Bizum Phone: 700000000
* Key: 1234
* SMS: 123456
