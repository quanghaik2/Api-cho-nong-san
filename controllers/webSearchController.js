const axios = require("axios");
const { processUserQuery } = require("../services/geminiService");

const webSearch = async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ message: "Vui lòng gửi câu hỏi để tìm kiếm!" });
  }

  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=5`;
    const searchResponse = await axios.get(searchUrl);
    const searchResults = searchResponse.data.items?.map(item => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
      ogDescription: item.pagemap?.metatags?.[0]?.['og:description'] || item.snippet, // Lấy og:description nếu có, ngược lại dùng snippet
    })) || [];

    const geminiQuery = `Phân tích thông tin từ web về "${query}". Dữ liệu tìm kiếm: ${JSON.stringify(searchResults)}. Trả về câu trả lời chi tiết, tự nhiên và phù hợp, liên quan trực tiếp đến câu hỏi, tận dụng toàn bộ thông tin từ title, snippet và ogDescription để cung cấp câu trả lời đầy đủ và có ý nghĩa, không chỉ gợi ý tìm kiếm.`;
    const geminiResponse = await processUserQuery(geminiQuery);

    return res.status(200).json({
      message: geminiResponse.natural_response,
      web_info: searchResults,
    });
  } catch (error) {
    console.error("Lỗi tìm kiếm web:", error.message);
    return res.status(500).json({ message: "Có lỗi xảy ra khi tìm kiếm thông tin từ web. Vui lòng thử lại!" });
  }
};

const searchProductInfo = async (req, res) => {
  const { product_name, address, query } = req.body;
  console.log("Received product_name:", product_name);
  console.log("Received address:", address);
  console.log("Received query:", query);

  if (!query) {
    return res.status(400).json({ message: "Vui lòng cung cấp câu hỏi cụ thể!" });
  }

  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;
    const searchQuery = query;
    console.log("Search query sent to Google Custom Search:", searchQuery);

    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&num=5`;
    const searchResponse = await axios.get(searchUrl);
    const searchResults = searchResponse.data.items?.map(item => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
      ogDescription: item.pagemap?.metatags?.[0]?.['og:description'] || item.snippet, // Lấy og:description nếu có, ngược lại dùng snippet
    })) || [];

    console.log("Google Custom Search results:", searchResults);

    const geminiQuery = `Phân tích thông tin từ web về "${searchQuery}". Dữ liệu tìm kiếm: ${JSON.stringify(searchResults)}. Trả về câu trả lời chi tiết, tự nhiên và phù hợp, liên quan trực tiếp đến câu hỏi, tận dụng toàn bộ thông tin từ title, snippet và ogDescription để cung cấp câu trả lời đầy đủ và có ý nghĩa, không chỉ gợi ý tìm kiếm mà cung cấp câu trả lời trực tiếp.`;
    const geminiResponse = await processUserQuery(geminiQuery);

    console.log("Gemini response:", geminiResponse.natural_response);

    return res.status(200).json({
      message: geminiResponse.natural_response,
    });
  } catch (error) {
    console.error("Lỗi tìm kiếm thông tin sản phẩm:", error.message);
    return res.status(500).json({ message: "Có lỗi xảy ra khi tìm kiếm thông tin sản phẩm. Vui lòng thử lại!" });
  }
};

module.exports = {
  webSearch,
  searchProductInfo,
};