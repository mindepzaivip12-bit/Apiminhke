const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// Render sẽ tự động cấp PORT, nếu chạy local thì dùng 3000
const PORT = process.env.PORT || 3000;

// Link API gốc (LƯU Ý: Token 'at=' sẽ hết hạn, nếu lỗi 403/401 bạn phải thay token mới)
const API_URL = 'https://wtxmd52.tele68.com/v1/txmd5/lite-sessions?cp=R&cl=R&pf=web&at=ab36aa88e2c9868ae0e8bc61adbd18dc';

// ==========================================
// HÀM GỌI API GỐC
// ==========================================
async function fetchRawData() {
    try {
        const response = await axios.get(API_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            },
            timeout: 10000
        });
        return response.data;
    } catch (error) {
        console.error("[-] Lỗi lấy dữ liệu:", error.message);
        return null;
    }
}

// ==========================================
// THUẬT TOÁN PHÂN TÍCH
// ==========================================
function analyzeAndPredict(list) {
    if (!list || list.length < 5) {
        return { 
            prediction: "WAIT", 
            point_prediction: 0, 
            confidence: "0%", 
            reason: "Chưa đủ dữ liệu (cần ít nhất 5 ván)" 
        };
    }

    let taiCount = 0;
    let xiuCount = 0;
    let streak = 1;
    let lastResult = list[0].resultTruyenThong;

    // Thống kê 20 ván gần nhất
    const recentList = list.slice(0, 20);
    recentList.forEach(item => {
        if (item.resultTruyenThong === 'TAI') taiCount++;
        else xiuCount++;
    });

    // Đếm chuỗi (Cầu bệt)
    for (let i = 1; i < list.length; i++) {
        if (list[i].resultTruyenThong === lastResult) {
            streak++;
        } else {
            break;
        }
    }

    // Logic Thuật Toán Dự Đoán
    let prediction = "";
    let reason = "";
    let confidence = "60%";

    if (streak >= 4) {
        prediction = lastResult === 'TAI' ? 'XIU' : 'TAI';
        reason = `Phát hiện cầu bệt ${streak} ván ${lastResult}. Thuật toán bẻ cầu.`;
        confidence = "75%";
    } else if (taiCount > xiuCount + 6) {
        prediction = 'XIU';
        reason = `Tài xuất hiện quá dày (${taiCount} ván/20). Dự đoán Xỉu.`;
        confidence = "65%";
    } else if (xiuCount > taiCount + 6) {
        prediction = 'TAI';
        reason = `Xỉu xuất hiện quá dày (${xiuCount} ván/20). Dự đoán Tài.`;
        confidence = "65%";
    } else {
        prediction = lastResult === 'TAI' ? 'XIU' : 'TAI';
        reason = "Cầu đang cân bằng (1-1). Dự đoán đảo chiều.";
        confidence = "55%";
    }

    let lastPoint = list[0].point;
    let pointPrediction = lastPoint > 10 ? Math.floor(Math.random() * 6) + 3 : Math.floor(Math.random() * 8) + 10;

    return {
        prediction: prediction,
        point_prediction: pointPrediction,
        confidence: confidence,
        reason: reason,
        stats: {
            recent_20_tai: taiCount,
            recent_20_xiu: xiuCount,
            current_streak: streak,
            last_result: lastResult
        }
    };
}

// ==========================================
// ROUTES (API ENDPOINTS)
// ==========================================

// 1. ĐÃ SỬA: Gõ link gốc (/) là ra luôn kết quả
app.get('/', async (req, res) => {
    try {
        const data = await fetchRawData();
        
        if (!data || !data.list || data.list.length === 0) {
            return res.status(500).json({ 
                status: "error",
                message: "Không thể lấy dữ liệu từ Server gốc. Token có thể đã hết hạn!" 
            });
        }

        const analysis = analyzeAndPredict(data.list);

        res.json({
            status: "success",
            timestamp: new Date().toISOString(),
            latest_session: data.list[0],
            type_stat: data.typeStat,
            algorithm_analysis: analysis
        });

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// 2. Vẫn giữ đường dẫn /api/predict để dự phòng
app.get('/api/predict', async (req, res) => {
    try {
        const data = await fetchRawData();
        if (!data) return res.status(500).json({ status: "error", message: "Lỗi lấy dữ liệu hoặc Token hết hạn." });
        
        const analysis = analyzeAndPredict(data.list);
        res.json({
            status: "success",
            latest_session: data.list[0],
            algorithm_analysis: analysis
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`[+] Server đang chạy trên port ${PORT}`);
});
