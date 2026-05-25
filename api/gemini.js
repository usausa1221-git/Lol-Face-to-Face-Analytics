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
        
        // 💡 モデル名を最新の「gemini-2.5-flash」に変更しました
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const prompt = `
            あなたはLeague of Legendsのプロコーチです。以下の条件における対面マッチアップの攻略情報をプレイヤーに提供してください。
            自分のチャンピオン: ${myChamp}
            相手のチャンピオン: ${enemyChamp}
            この対面の勝率: ${winRate}%

            【出力ルール】
            必ず、以下のJSONフォーマットのキー名（skills, weaknesses, tactics, items）を持ったオブジェクトとして出力してください。余計な挨拶や解説テキストは絶対に含めず、純粋なJSONオブジェクト単体のみを返してください。各値は箇条書きのテキストにしてください。

            {
                "skills": "相手の主要スキルの詳細とCDや回避方法などの注意点",
                "weaknesses": "相手チャンピオンの明確な弱点や突くべきタイミング",
                "tactics": "レーン戦・集団戦での具体的な立ち回り（勝率の数値を意識すること）",
                "items": "推奨されるコア装備や対面用のカウンターアイテム"
            }
        `;

        const googleResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generation_config: {
                    response_mime_type: "application/json"
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        const data = await googleResponse.json();

        if (!googleResponse.ok) {
            return res.status(googleResponse.status).json({ 
                error: `Google API Error: ${data.error?.message || '不明なエラー'}` 
            });
        }

        if (!data.candidates || data.candidates.length === 0) {
            return res.status(400).json({ error: "AIの応答候補(candidates)が空でした。" });
        }

        const aiJsonString = data.candidates[0].content.parts[0].text;
        
        const parsedData = JSON.parse(aiJsonString.trim());
        return res.status(200).json(parsedData);

    } catch (error) {
        return res.status(500).json({ error: `Server Error: ${error.message}` });
    }
}
