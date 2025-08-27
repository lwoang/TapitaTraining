// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
import { connectMongoDB } from "./mongodb.js";
import { saveShopData, getShopData, updateShopAccessToken, deactivateShop, getAllActiveShops } from "./services/shopService.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;


// Kết nối MongoDB
connectMongoDB();

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (req, res, next) => {
    // Sau khi authentication thành công, lưu thông tin shop
    try {
      const session = res.locals.shopify.session;
      if (session && session.shop && session.accessToken) {
        console.log(`Authentication successful for shop: ${session.shop}`);
        
        // Tạo Shopify GraphQL client
        const client = new shopify.api.clients.Graphql({
          session: session,
        });
        
        // Lưu thông tin shop vào database
        await saveShopData(session.shop, session.accessToken, client);
        console.log(`Shop data saved for: ${session.shop}`);
      }
    } catch (error) {
      console.error('Error saving shop data after authentication:', error);
      // Không block authentication flow nếu có lỗi khi lưu data
    }
    
    // Tiếp tục với redirect
    return shopify.redirectToShopifyOrAppRoot()(req, res, next);
  }
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

// API endpoint để lấy thông tin shop hiện tại
app.get("/api/shop/info", async (_req, res) => {
  try {
    const session = res.locals.shopify.session;
    const shopData = await getShopData(session.shop);
    
    if (!shopData) {
      return res.status(404).send({ error: "Shop not found" });
    }
    
    // Trả về thông tin cần thiết (không bao gồm access token)
    const response = {
      shop: shopData.shop,
      shopEmail: shopData.shopEmail,
      ownerEmail: shopData.ownerEmail,
      address: shopData.address,
      phone: shopData.phone,
      shopifyPlan: shopData.shopifyPlan,
      installedAt: shopData.installedAt,
      updatedAt: shopData.updatedAt,
      isActive: shopData.isActive
    };
    
    res.status(200).send(response);
  } catch (error) {
    console.error("Error getting shop info:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// API endpoint để refresh thông tin shop
app.post("/api/shop/refresh", async (_req, res) => {
  try {
    const session = res.locals.shopify.session;
    
    // Tạo Shopify GraphQL client
    const client = new shopify.api.clients.Graphql({
      session: session,
    });
    
    // Cập nhật thông tin shop từ Shopify
    const updatedShop = await saveShopData(session.shop, session.accessToken, client);
    
    // Trả về thông tin đã cập nhật
    const response = {
      shop: updatedShop.shop,
      shopEmail: updatedShop.shopEmail,
      ownerEmail: updatedShop.ownerEmail,
      address: updatedShop.address,
      phone: updatedShop.phone,
      shopifyPlan: updatedShop.shopifyPlan,
      installedAt: updatedShop.installedAt,
      updatedAt: updatedShop.updatedAt,
      isActive: updatedShop.isActive
    };
    
    res.status(200).send(response);
  } catch (error) {
    console.error("Error refreshing shop info:", error);
    res.status(500).send({ error: "Failed to refresh shop info" });
  }
});

// API endpoint để lấy danh sách tất cả shops (cho admin)
app.get("/api/admin/shops", async (_req, res) => {
  try {
    const shops = await getAllActiveShops();
    
    // Trả về thông tin cần thiết (không bao gồm access tokens)
    const response = shops.map(shop => ({
      shop: shop.shop,
      shopEmail: shop.shopEmail,
      ownerEmail: shop.ownerEmail,
      address: shop.address,
      phone: shop.phone,
      shopifyPlan: shop.shopifyPlan,
      installedAt: shop.installedAt,
      updatedAt: shop.updatedAt,
      isActive: shop.isActive
    }));
    
    res.status(200).send(response);
  } catch (error) {
    console.error("Error getting all shops:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const countData = await client.request(`
    query shopifyProductCount {
      productsCount {
        count
      }
    }
  `);

  res.status(200).send({ count: countData.data.productsCount.count });
});

app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT);
