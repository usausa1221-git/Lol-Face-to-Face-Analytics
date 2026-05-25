export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { myChamp, enemyChamp, winRate } = req.body;
        const apiKey = process.env.GEMINI_API_KEY; 

        if (!apiKey) {
            return res.status(500).json({ error: 'サーバーにGEMINI_API_KEYが設定されていません。' });
        }
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const prompt = `
            あなたはLeague of Legendsのプロコーチです。以下の条件における対面マッチアップの攻略情報をプレイヤーに提供してください。
            自分のチャンピオン: ${myChamp}
            相手のチャンピオン: ${enemyChamp}
            この対面の勝率: ${winRate}%
            
            1. 相手のスキル詳細と注意点
            2. 相手の明確な弱点
            3. レーン戦・集団戦での具体的な立ち回り
            4. 推奨されるコア装備・対策装備
        `;

        const googleResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                // 💡安全フィルターをLoLの解説用に少し緩める設定を追加
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        const data = await googleResponse.json();

        // 💡 Googleからエラーが返ってきた、またはブロックされた場合のチェックを追加
        if (!data.candidates || data.candidates.length === 0) {
            console.error("Gemini Error Response:", data);
            
            // ブロックされた理由が記載されているかチェック
            const reason = data.promptFeedback?.blockReason || "AIの安全フィルターによって出力がブロックされたか、APIキーが無効です。";
            return res.status(400).json({ error: reason });
        }

        const aiText = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ text: aiText });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
