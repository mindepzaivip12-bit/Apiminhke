const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// ⚠️ ĐÂY LÀ LINK TELE68 CỦA BẠN (Tự động lấy dữ liệu)
const TARGET_URL = 'https://wtxmd52.tele68.com/v1/txmd5/lite-sessions?cp=R&cl=R&pf=web&at=ab36aa88e2c9868ae0e8bc61adbd18dc';

// ==========================================
// THUẬT TOÁN PHÂN TÍCH
// ==========================================
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

// ==========================================
// ROUTE CHÍNH (Mở link Render là ra kết quả)
// ==========================================
app.get('/', async (req, res) => {
    try {
        // Gọi lấy dữ liệu từ tele68
        const response = await axios.get(TARGET_URL, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*'
            },
            timeout: 10000
        });

        const data = response.data;

        if (!data || !data.list || data.list.length === 0) {
            return res.status(500).json({ status: "error", message: "Không lấy được dữ liệu hoặc Token hết hạn." });
        }

        // Chạy thuật toán
        const analysis = analyzeAndPredict(data.list);

        // TRẢ VỀ JSON GỘP (Dữ liệu gốc + Dự đoán)
        res.json({
            status: "success",
            session_id: data.list[0].id, 
            timestamp: new Date().toISOString(),
            
            // Toàn bộ dữ liệu gốc giống trong ảnh của bạn
            data: {
                list: data.list,
                typeStat: data.typeStat
            },
            
            // Kết quả thuật toán
            prediction: {
                du_doan: analysis.prediction,
                diem_du_doan: analysis.point_prediction,
                do_tin_cay: analysis.confidence,
                ly_do: analysis.reason,
                thong_ke: analysis.stats
            }
        });

    } catch (error) {
        res.status(500).json({ status: "error", message: "Lỗi lấy dữ liệu: " + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[+] Server đang chạy trên port ${PORT}`);
});
