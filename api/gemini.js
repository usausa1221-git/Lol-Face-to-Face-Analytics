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

        // api/gemini.js のプロンプト部分を修正

        const prompt = `
        あなたはLeague of Legendsのプロコーチです。以下の条件における対面マッチアップの攻略情報を、**必ず以下のMarkdown形式のフォーマットで**日本語で詳しく出力してください。

        自分のチャンピオン: ${myChamp}
        相手のチャンピオン: ${enemyChamp}
        この対面の勝率: ${winRate}% (${myChamp}側から見た数値)

        ---
        ### 1. 相手のスキル詳細 & 注意点
        （ここにスキル名と注意点。箇条書き推奨）

        ### 2. 相手の明確な弱点
        （ここに弱点。箇条書き推奨）

        ### 3. 立ち回り (有利に動く方法)
        （ここにレーン戦・集団戦の立ち回り。箇条書き推奨）

        ### 4. 推奨装備
        （ここにコア装備・対策装備。箇条書き推奨）
        ---
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
