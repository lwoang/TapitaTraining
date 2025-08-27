import { Shop } from '../models/Shop.js';

/**
 * Lưu thông tin cơ bản của shop
 * @param {string} shopDomain - Domain của shop
 * @param {string} accessToken - Access token
 * @param {object} shopifyClient - Shopify GraphQL client
 */
export const saveShopData = async (shopDomain, accessToken, shopifyClient) => {
  try {
    console.log(`Saving shop data for: ${shopDomain}`);
    
    // Query đơn giản để lấy thông tin cần thiết
    const shopInfoQuery = `
      query getBasicShopInfo {
        shop {
          email
          customerEmail
          address1
          city
          province
          country
          zip
          phone
          plan {
            displayName
          }
        }
      }
    `;

    // Lấy thông tin từ Shopify API
    const response = await shopifyClient.request(shopInfoQuery);
    const shopData = response.data.shop;

    // Tạo địa chỉ đầy đủ
    const fullAddress = [
      shopData.address1,
      shopData.city,
      shopData.province,
      shopData.country
    ].filter(Boolean).join(', ');

    // Chuẩn bị dữ liệu đơn giản
    const shopRecord = {
      shop: shopDomain,
      accessToken: accessToken,
      shopEmail: shopData.email,
      ownerEmail: shopData.customerEmail || shopData.email,
      address: {
        street: shopData.address1,
        city: shopData.city,
        province: shopData.province,
        country: shopData.country,
        zipCode: shopData.zip
      },
      phone: shopData.phone,
      shopifyPlan: shopData.plan?.displayName || 'Basic',
      updatedAt: new Date(),
      isActive: true
    };

    // Lưu hoặc cập nhật
    const savedShop = await Shop.findOneAndUpdate(
      { shop: shopDomain },
      shopRecord,
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log(`Shop data saved successfully for: ${shopDomain}`);
    return savedShop;

  } catch (error) {
    console.error(`Error saving shop data for ${shopDomain}:`, error);
    throw error;
  }
};

/**
 * Lấy thông tin shop từ database
 */
export const getShopData = async (shopDomain) => {
  try {
    const shop = await Shop.findOne({ shop: shopDomain });
    return shop;
  } catch (error) {
    console.error(`Error getting shop data for ${shopDomain}:`, error);
    throw error;
  }
};

/**
 * Cập nhật access token
 */
export const updateShopAccessToken = async (shopDomain, newAccessToken) => {
  try {
    const updatedShop = await Shop.findOneAndUpdate(
      { shop: shopDomain },
      { 
        accessToken: newAccessToken,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    console.log(`Access token updated for shop: ${shopDomain}`);
    return updatedShop;
  } catch (error) {
    console.error(`Error updating access token for ${shopDomain}:`, error);
    throw error;
  }
};

/**
 * Đánh dấu shop không hoạt động khi uninstall
 */
export const deactivateShop = async (shopDomain) => {
  try {
    const deactivatedShop = await Shop.findOneAndUpdate(
      { shop: shopDomain },
      { 
        isActive: false,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    console.log(`Shop deactivated: ${shopDomain}`);
    return deactivatedShop;
  } catch (error) {
    console.error(`Error deactivating shop ${shopDomain}:`, error);
    throw error;
  }
};

/**
 * Lấy tất cả shops đang hoạt động
 */
export const getAllActiveShops = async () => {
  try {
    const shops = await Shop.find({ isActive: true }).sort({ updatedAt: -1 });
    return shops;
  } catch (error) {
    console.error('Error getting all active shops:', error);
    throw error;
  }
};
