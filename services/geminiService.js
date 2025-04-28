// file geminiService.js
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// *** THAY ĐỔI MODEL TẠI ĐÂY ***
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro-latest", // Hoặc "gemini-1.5-pro" nếu bạn muốn phiên bản cụ thể
    // Cân nhắc thêm cấu hình tạo nội dung để kiểm soát đầu ra tốt hơn
    generationConfig: {
        // temperature: 0.2, // Giảm temperature để kết quả JSON ổn định hơn
        responseMimeType: "application/json", // Yêu cầu Gemini trả về trực tiếp JSON
    },
    // Cấu hình an toàn (tùy chọn, điều chỉnh nếu cần)
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
});

async function processUserQuery(query) {
    // *** CẢI TIẾN PROMPT ***
    const prompt = `
Bạn là một AI phân tích yêu cầu mua hàng. Nhiệm vụ của bạn là phân tích câu hỏi của người dùng và chỉ trả về một đối tượng JSON hợp lệ theo cấu trúc sau, không kèm theo bất kỳ giải thích hay định dạng markdown nào:
{
  "intent": "search_product | product_by_address | add_to_cart | view_cart | checkout | unknown",
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
  "natural_response": "string"
}

QUY TẮC:
1. Phân tích kỹ: Xác định chính xác intent và trích xuất tất cả params liên quan từ câu hỏi. Nếu không rõ, intent là "unknown".
2. Chuẩn hóa giá: Chuyển đổi các cách nói về giá (vd: "dưới 200k", "khoảng 1 triệu", "từ 50 đến 100 nghìn") thành price_min, price_max. 1k = 1000.
3. Xử lý địa chỉ: Nếu người dùng hỏi sản phẩm theo địa chỉ (product_by_address):
   - Trích xuất địa chỉ chi tiết nhất có thể.
   - Nếu địa chỉ không được hỗ trợ, hãy đề xuất địa chỉ gần đúng hoặc phổ biến trong suggestion.nearby_address và điều chỉnh natural_response cho phù hợp.
4. Xử lý tìm sản phẩm (search_product):
   - Trích xuất product_name cụ thể. Có thể có cả price_min, price_max, category.
   - natural_response nên xác nhận lại yêu cầu tìm kiếm.
5. Xử lý thêm vào giỏ (add_to_cart):
   - Trích xuất product_name và quantity (mặc định là 1 nếu không nói rõ).
   - natural_response nên xác nhận hành động thêm vào giỏ.
6. Câu trả lời tự nhiên (natural_response): Luôn tạo một câu phản hồi thân thiện, xác nhận lại yêu cầu hoặc thông báo kết quả dự kiến.
7. Suggestion: Chỉ điền suggestion.nearby_address khi cần thiết theo quy tắc 3. Các trường hợp khác để {}.
8. Output: Chỉ trả về JSON.

VÍ DỤ:
- "Tìm gạo ST25 giá dưới 250k ở Cần Thơ" →
  {
    "intent": "search_product",
    "params": { "product_name": "gạo ST25", "price_max": 250000, "address": "Cần Thơ", "category": "gạo", "price_min": null, "quantity": null },
    "suggestion": {},
    "natural_response": "Bạn muốn tìm gạo ST25 giá dưới 250k ở Cần Thơ đúng không? Để mình kiểm tra nhé!"
  }
- "Có thịt bò ở quận Ninh Kiều không?" →
  {
    "intent": "product_by_address",
    "params": { "address": "quận Ninh Kiều", "product_name": "thịt bò", "category": "thịt", "price_min": null, "price_max": null, "quantity": null },
    "suggestion": {},
    "natural_response": "Bạn đang tìm thịt bò ở quận Ninh Kiều à? Để mình xem có những loại nào nhé!"
  }
- "Thêm 2kg thịt ba chỉ vào giỏ" →
  {
    "intent": "add_to_cart",
    "params": { "product_name": "thịt ba chỉ", "quantity": 2, "category": "thịt", "price_min": null, "price_max": null, "address": null },
    "suggestion": {},
    "natural_response": "OK bạn, mình sẽ thêm 2kg thịt ba chỉ vào giỏ hàng của bạn ngay!"
  }
- "Tôi muốn mua đồ ăn ở Anh Quốc" →
  {
    "intent": "product_by_address",
    "params": { "address": "Anh Quốc", "product_name": null, "category": "đồ ăn", "price_min": null, "price_max": null, "quantity": null },
    "suggestion": { "nearby_address": "Hà Nội hoặc TP.HCM" },
    "natural_response": "Xin lỗi bạn, hiện tại mình chưa hỗ trợ giao hàng ở Anh Quốc. Bạn có muốn tham khảo sản phẩm ở Hà Nội hoặc TP.HCM không?"
  }
- "Xem giỏ hàng" →
  {
    "intent": "view_cart",
    "params": { "product_name": null, "category": null, "price_min": null, "price_max": null, "address": null, "quantity": null },
    "suggestion": {},
    "natural_response": "Đây là giỏ hàng hiện tại của bạn."
  }

Câu hỏi: "${query}"
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        // Khi dùng responseMimeType: "application/json", Gemini trả về JSON trực tiếp
        const responseData = JSON.parse(response.text());
        return responseData;
    } catch (error) {
        console.error("Lỗi Gemini API:", error.message);
        // Phân tích lỗi chi tiết hơn nếu có thể (vd: blocked due to safety)
        let errorMessage = "Ôi, mình chưa hiểu câu hỏi của bạn. Bạn có thể nói rõ hơn một chút được không?";
        if (error.message.includes("Could not parse JSON")) {
             errorMessage = "Xin lỗi, mình đang gặp chút trục trặc khi xử lý yêu cầu. Bạn thử lại xem sao nhé.";
             // Có thể log lại prompt và lỗi để debug
             console.error("Lỗi JSON Parse. Prompt:", prompt);
        } else if (error.response && error.response.promptFeedback) {
            // Xử lý nếu bị chặn bởi bộ lọc an toàn
             console.error("Prompt Feedback:", error.response.promptFeedback);
             errorMessage = "Yêu cầu của bạn có thể chứa nội dung không phù hợp. Vui lòng thử lại với nội dung khác.";
        }
        return {
            intent: "unknown",
            params: {},
            suggestion: {}, // Đảm bảo suggestion luôn là object
            natural_response: errorMessage
        };
    }
}

module.exports = { processUserQuery };