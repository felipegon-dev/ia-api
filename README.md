# IA-API

Tech NodeJs

* API
* MySQL
  * Tables: users, orders, addresses, paymentMethods,userConfig
* Redis stream
* worker with docker. 



## Endpoints
* http://localhost:3000/api/v1/user/1


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
