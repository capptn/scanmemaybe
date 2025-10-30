
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { db } = require('./firebase');
const { uploadFile, attachFileToProduct } = require('./printful');

const placement = {
  area_width: parseInt(process.env.PLACEMENT_AREA_WIDTH || '3600', 10),
  area_height: parseInt(process.env.PLACEMENT_AREA_HEIGHT || '4800', 10),
  width: parseInt(process.env.PLACEMENT_WIDTH || '600', 10),
  height: parseInt(process.env.PLACEMENT_HEIGHT || '600', 10),
  top: parseInt(process.env.PLACEMENT_TOP || '2100', 10),
  left: parseInt(process.env.PLACEMENT_LEFT || '1500', 10),
};

async function processOrder(order) {
  const fixedProductId = parseInt(process.env.SHOPIFY_PRODUCT_ID || '0', 10);
  const results = [];
  for (const line of order.line_items || []) {
    if (fixedProductId && line.product_id !== fixedProductId) continue;
    const qty = line.quantity || 1;
    for (let i=0; i<qty; i++) {
      const uniqueId = uuidv4();
      const qrLink = (process.env.BASE_QR_URL || 'https://qr.capptn.com/qrcode/') + uniqueId;

      const png = await QRCode.toBuffer(qrLink, { width: 1024, margin: 1 });
      const pfFile = await uploadFile(png, `qr-${uniqueId}.png`);

      let pfTask = null;
      if (process.env.PRINTFUL_PRODUCT_ID) {
        pfTask = await attachFileToProduct(process.env.PRINTFUL_PRODUCT_ID, pfFile.id, placement);
      }

      await db().collection('qrCodes').doc(uniqueId).set({
        shop: order?.source_name || 'shopify',
        orderId: order.id,
        orderName: order.name,
        lineItemId: line.id,
        productId: line.product_id,
        variantId: line.variant_id,
        customerEmail: order?.email || order?.customer?.email || null,
        qrLink,
        printfulFileId: pfFile.id,
        printfulTaskId: pfTask ? pfTask.task_key : null,
        createdAt: new Date().toISOString(),
      });

      results.push({ uniqueId, qrLink, printfulFileId: pfFile.id, printfulTaskId: pfTask ? pfTask.task_key : null });
    }
  }
  return results;
}

module.exports = { processOrder };
