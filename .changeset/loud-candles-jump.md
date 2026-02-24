---
"saleor-app-avatax": patch
"saleor-app-cms": patch
"saleor-app-klaviyo": patch
"saleor-app-payment-np-atobarai": patch
"saleor-app-products-feed": patch
"saleor-app-search": patch
"saleor-app-segment": patch
"saleor-app-smtp": patch
"saleor-app-payment-stripe": patch
---

Added support for self-hosted Redis as an APL backend. Apps can now use `APL=redis` with `REDIS_URL` to store installation auth data.
