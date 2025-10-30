
# Shopify QR App (2026-ready)

**Custom App mit OAuth + Webhook-Registrierung** für das neue Shopify-Modell (gültig ab 2026).  
Funktion: Pro Bestellung wird ein **individueller QR-Code** erzeugt, in **Firebase** gespeichert, als **PNG** zu **Printful** hochgeladen und (optional) an ein festes **Printful-Produkt-Template** angehängt.

## Features
- OAuth-Installation über Partner-Dashboard-Credentials
- Automatische Registrierung des Webhooks `orders/create`
- HMAC-Verifizierung (nutzt `SHOPIFY_API_SECRET`)
- QR-Code (PNG, 1024px) mit `qrcode`
- Firebase Firestore Speicherung
- Printful Upload + Template-Verknüpfung
- Test-Endpoint ohne Shopify

## Setup

1) **Konfiguration**
```bash
cp .env.example .env
# trage alle Variablen ein
```

2) **Install**
```bash
npm install
npm run start
```

3) **App installieren (OAuth)**
- Rufe an deinem Server auf:
```
GET /auth?shop=<dein-shop>.myshopify.com
```
- Nach erfolgreicher Auth wird der Webhook automatisch registriert.

4) **Webhook-Endpoint**
```
POST /webhooks/orders-create
```

5) **Test ohne Shopify**
```
POST /test/generate
{}
```

## .env Hinweise
- `SHOPIFY_WEBHOOK_SECRET` wird automatisch aus `SHOPIFY_API_SECRET` bezogen, kann aber separat gesetzt werden.
- `SHOPIFY_PRODUCT_ID` auf die ID deines Hoodie-Produkts setzen (0 = alle).

## Printful Platzierung
Die Standardwerte (Brust, 600×600 px) sind über Umgebungsvariablen einstellbar:
```
PLACEMENT_AREA_WIDTH, PLACEMENT_AREA_HEIGHT,
PLACEMENT_WIDTH, PLACEMENT_HEIGHT,
PLACEMENT_TOP, PLACEMENT_LEFT
```

## Deployment
- Stelle sicher, dass `SHOPIFY_APP_URL` öffentlich per HTTPS erreichbar ist
- Setze die Umgebungsvariablen in deinem Hoster
- Öffne `https://<shop>.myshopify.com/admin/apps` → „Install app“ (nachdem du /auth gestartet hast)

## Datenmodell (Firestore)
```
/shops/{shopDomain} {
  accessToken, scopes, installedAt
}
/qrCodes/{uuid} {
  orderId, orderName, lineItemId, productId, variantId,
  customerEmail, qrLink, printfulFileId, printfulTaskId, createdAt
}
```
