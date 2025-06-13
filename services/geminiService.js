const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const axios = require("axios");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.2,
    responseMimeType: "application/json",
  },
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ],
});

async function processUserQuery(query) {
  let searchResults = [];

  const webInfoKeywords = ["nguồn gốc", "đánh giá", "có tốt không", "thông tin", "tại", "chất lượng", "tác dụng", "sức khỏe"];
  const mightNeedWebInfo = webInfoKeywords.some(keyword => query.toLowerCase().includes(keyword));

  if (mightNeedWebInfo) {
    try {
      const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
      const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`;
      const searchResponse = await axios.get(searchUrl);
      searchResults = searchResponse.data.items?.slice(0, 3).map(item => ({
        title: item.title,
        snippet: item.snippet,
        link: item.link,
      })) || [];
      console.log("Google Custom Search results:", searchResults);
    } catch (error) {
      console.error("Lỗi tìm kiếm web trong Gemini:", error.message);
      searchResults = [];
    }
  }

  const prompt = `
Bạn là một AI phân tích yêu cầu mua hàng và tìm kiếm thông tin bổ sung từ web. Nhiệm vụ của bạn là phân tích câu hỏi của người dùng và trả về một đối tượng JSON hợp lệ theo cấu trúc sau, không kèm theo bất kỳ giải thích hay định dạng markdown nào:
{
  "intent": "search_product | product_by_address | add_to_cart | view_cart | checkout | search_web_info | unknown",
  "params": {
    "product_name": "string | null",
    "category": "string | null",
    "price_min": "number | null",
    "price_max": "number | null",
    "address": "string | null",
    "quantity": "number | null"
  },
  "suggestion": {
    "nearby_address": "string | null"
  },
  "natural_response": "string",
  "web_info": "array | null"
}

QUY TẮC:
1. Phân tích kỹ: Xác định chính xác intent và trích xuất tất cả params liên quan từ câu hỏi. Nếu không rõ, intent là "unknown".
2. Intent "search_web_info": Nhận diện các câu hỏi yêu cầu thông tin bổ sung từ web (ví dụ: "nguồn gốc của gạo ST25", "đánh giá thịt bò Ninh Kiều", "gạo ST25 có tốt không", "chất lượng của gạo ST25", "gạo ST25 có tác dụng gì đến sức khỏe?", "thông tin về Cần Thơ").
   - Dựa trên dữ liệu tìm kiếm từ web đã cung cấp (nếu có), trả về câu trả lời trực tiếp, ngắn gọn, tự nhiên và phù hợp, thay vì chỉ gợi ý tìm kiếm.
   - Nếu không có dữ liệu tìm kiếm, trả về câu trả lời như "Mình không tìm thấy thông tin cụ thể về [sản phẩm/địa chỉ]."
   - Điền thông tin web vào "web_info" nếu có dữ liệu.
3. Chuẩn hóa dữ liệu:
   - Chuẩn hóa product_name: Ví dụ "gạo st 25", "Gạo ST25" thành "gạo ST25".
   - Chuẩn hóa địa chỉ: Ví dụ "can tho", "Cần Thơ" thành "Cần Thơ".
   - Nếu câu hỏi chỉ về địa chỉ (ví dụ: "Thông tin về Cần Thơ"), đặt product_name là null.
4. Xử lý các câu hỏi phụ:
   - "Chất lượng của [tên sản phẩm]": Trả về thông tin về chất lượng, độ tin cậy hoặc đánh giá sản phẩm.
   - "[Tên sản phẩm] có tác dụng gì đến sức khỏe?": Trả về thông tin về lợi ích sức khỏe hoặc tác dụng của sản phẩm, nếu có.
   - "Thông tin về [tên địa chỉ]": Trả về thông tin tổng quan về địa chỉ (vùng miền, đặc sản, v.v.).
5. Câu trả lời tự nhiên (natural_response): Luôn tạo một câu phản hồi thân thiện, cụ thể với ngữ cảnh, và tự nhiên. Nếu có dữ liệu web, tổng hợp và trả lời trực tiếp; nếu không, thông báo không tìm thấy thông tin.
6. Suggestion: Chỉ điền suggestion.nearby_address khi cần thiết. Các trường hợp khác để {}.
7. Web Info: Điền mảng "web_info" với dữ liệu tìm kiếm từ web nếu có (title, snippet, link). Nếu không có, để null.
8. Output: Chỉ trả về JSON.

VÍ DỤ:
- "Chất lượng của gạo ST25" với dữ liệu web: { "title": "Gạo ST25 chất lượng cao", "snippet": "Gạo ST25 được đánh giá là loại gạo thơm ngon, đạt tiêu chuẩn xuất khẩu..." } →
  {
    "intent": "search_web_info",
    "params": { "product_name": "gạo ST25", "category": "gạo", "price_min": null, "price_max": null, "address": null, "quantity": null },
    "suggestion": {},
    "natural_response": "Gạo ST25 được đánh giá cao về chất lượng, thơm ngon và đạt tiêu chuẩn xuất khẩu.",
    "web_info": [{ "title": "Gạo ST25 chất lượng cao", "snippet": "Gạo ST25 được đánh giá là loại gạo thơm ngon, đạt tiêu chuẩn xuất khẩu...", "link": "..." }]
  }
- "Gạo ST25 có tác dụng gì đến sức khỏe?" với dữ liệu web: { "title": "Lợi ích của gạo ST25", "snippet": "Gạo ST25 giàu dinh dưỡng, tốt cho hệ tiêu hóa..." } →
  {
    "intent": "search_web_info",
    "params": { "product_name": "gạo ST25", "category": "gạo", "price_min": null, "price_max": null, "address": null, "quantity": null },
    "suggestion": {},
    "natural_response": "Gạo ST25 giàu dinh dưỡng, hỗ trợ hệ tiêu hóa và tốt cho sức khỏe.",
    "web_info": [{ "title": "Lợi ích của gạo ST25", "snippet": "Gạo ST25 giàu dinh dưỡng, tốt cho hệ tiêu hóa...", "link": "..." }]
  }
- "Thông tin về Cần Thơ" với dữ liệu web: { "title": "Cần Thơ - Thủ phủ miền Tây", "snippet": "Cần Thơ nổi tiếng với chợ nổi Cái Răng..." } →
  {
    "intent": "search_web_info",
    "params": { "product_name": null, "category": null, "price_min": null, "price_max": null, "address": "Cần Thơ", "quantity": null },
    "suggestion": {},
    "natural_response": "Cần Thơ là thủ phủ miền Tây, nổi tiếng với chợ nổi Cái Răng và nhiều đặc sản hấp dẫn.",
    "web_info": [{ "title": "Cần Thơ - Thủ phủ miền Tây", "snippet": "Cần Thơ nổi tiếng với chợ nổi Cái Răng...", "link": "..." }]
  }
- "Chất lượng của gạo ST25" mà không có dữ liệu web →
  {
    "intent": "search_web_info",
    "params": { "product_name": "gạo ST25", "category": "gạo", "price_min": null, "price_max": null, "address": null, "quantity": null },
    "suggestion": {},
    "natural_response": "Mình không tìm thấy thông tin cụ thể về chất lượng của gạo ST25.",
    "web_info": null
  }

Dữ liệu tìm kiếm từ web: ${JSON.stringify(searchResults)}

Câu hỏi: "${query}"
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseData = JSON.parse(response.text());
    return responseData;
  } catch (error) {
    console.error("Lỗi Gemini API:", error.message);
    let errorMessage = "Ôi, mình chưa hiểu câu hỏi của bạn. Bạn có thể nói rõ hơn một chút được không?";
    if (error.message.includes("Could not parse JSON")) {
      errorMessage = "Xin lỗi, mình đang gặp chút trục trặc khi xử lý yêu cầu. Bạn thử lại xem sao nhé.";
      console.error("Lỗi JSON Parse. Prompt:", prompt);
    } else if (error.response && error.response.promptFeedback) {
      console.error("Prompt Feedback:", error.response.promptFeedback);
      errorMessage = "Yêu cầu của bạn có thể chứa nội dung không phù hợp. Vui lòng thử lại với nội dung khác.";
    }
    return {
      intent: "unknown",
      params: { product_name: null, category: null, price_min: null, price_max: null, address: null, quantity: null },
      suggestion: { nearby_address: null },
      natural_response: errorMessage,
      web_info: null
    };
  }
}

module.exports = { processUserQuery };