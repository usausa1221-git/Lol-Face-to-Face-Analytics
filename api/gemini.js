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

        // 💡 APIの出力をJSON形式（responseMimeType）に固定する設定をURLパラメーターではなくオプションで渡すための準備
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const prompt = `
            あなたはLeague of Legendsのプロコーチです。以下の条件における対面マッチアップの攻略情報をプレイヤーに提供してください。
            自分のチャンピオン: ${myChamp}
            相手のチャンピオン: ${enemyChamp}
            この対面の勝率: ${winRate}%

            【出力ルール】
            必ず、以下のJSONフォーマットのキー名（skills, weaknesses, tactics, items）を持ったオブジェクトとして出力してください。余計な挨拶や解説テキストは一切含めず、JSONデータのみを返してください。各値は箇条書き（改行付き）のテキストにしてください。

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
                // 💡 Geminiに確実にJSONを吐き出させるための超重要設定
                generationConfig: {
                    responseMimeType: "application/json"
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

        if (!data.candidates || data.candidates.length === 0) {
            return res.status(400).json({ error: "AIの応答が空でした。再度お試しください。" });
        }

        // Geminiから返ってきたJSON文字列
        const aiJsonString = data.candidates[0].content.parts[0].text;

        // 裏方側で一度パースして、中身が壊れていないかチェックしてフロントにそのままオブジェクトとして返す
        const parsedData = JSON.parse(aiJsonString);
        return res.status(200).json(parsedData);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
