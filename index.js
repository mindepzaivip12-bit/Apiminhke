const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors()); // Cho phép các trang web khác gọi API này
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Thuật toán phân tích (Bẻ cầu, Cân bằng, v.v.)
function analyzeAndPredict(list) {
    if (!list || list.length < 5) {
        return { prediction: "WAIT", point_prediction: 0, confidence: "0%", reason: "Chưa đủ dữ liệu" };
    }

    let taiCount = 0, xiuCount = 0, streak = 1;
    let lastResult = list[0].resultTruyenThong;

    list.slice(0, 20).forEach(item => {
        if (item.resultTruyenThong === 'TAI') taiCount++;
        else xiuCount++;
    });

    for (let i = 1; i < list.length; i++) {
        if (list[i].resultTruyenThong === lastResult) streak++;
        else break;
    }

    let prediction = "", reason = "", confidence = "60%";

    if (streak >= 4) {
        prediction = lastResult === 'TAI' ? 'XIU' : 'TAI';
        reason = `Bẻ cầu bệt ${streak} ván ${lastResult}.`;
        confidence = "75%";
    } else if (taiCount > xiuCount + 6) {
        prediction = 'XIU';
        reason = `Tài quá dày (${taiCount} ván/20). Đánh Xỉu.`;
        confidence = "65%";
    } else if (xiuCount > taiCount + 6) {
        prediction = 'TAI';
        reason = `Xỉu quá dày (${xiuCount} ván/20). Đánh Tài.`;
        confidence = "65%";
    } else {
        prediction = lastResult === 'TAI' ? 'XIU' : 'TAI';
        reason = "Cầu 1-1. Đảo chiều.";
        confidence = "55%";
    }

    let lastPoint = list[0].point;
    let pointPrediction = lastPoint > 10 ? Math.floor(Math.random() * 6) + 3 : Math.floor(Math.random() * 8) + 10;

    return {
        prediction, point_prediction: pointPrediction, confidence, reason,
        stats: { recent_20_tai: taiCount, recent_20_xiu: xiuCount, current_streak: streak, last_result: lastResult }
    };
}

// API Endpoint: Nhận link web truyền vào và trả kết quả
app.post('/api/predict', async (req, res) => {
    const targetUrl = req.body.url;
    if (!targetUrl) return res.status(400).json({ status: "error", message: "Thiếu link API cần lấy dữ liệu." });

    try {
        const response = await axios.get(targetUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*'
            },
            timeout: 10000
        });

        const data = response.data;
        if (!data || !data.list || data.list.length === 0) {
            return res.status(500).json({ status: "error", message: "Link không có dữ liệu hoặc Token hết hạn." });
        }

        const analysis = analyzeAndPredict(data.list);

        res.json({
            status: "success",
            session_id: data.list[0].id, // Trả về ID để HTML biết có phiên mới chưa
            latest_session: data.list[0],
            type_stat: data.typeStat,
            algorithm_analysis: analysis
        });

    } catch (error) {
        res.status(500).json({ status: "error", message: "Lỗi lấy dữ liệu từ link gốc: " + error.message });
    }
});

app.get('/', (req, res) => {
    res.json({ status: "API Running", message: "Sử dụng POST /api/predict với body { url: '...' }" });
});

app.listen(PORT, () => {
    console.log(`[+] API Server đang chạy trên port ${PORT}`);
});
