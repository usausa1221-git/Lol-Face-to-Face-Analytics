// Vercelが自動でサーバーサイドとして実行してくれるコード
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { myChamp, enemyChamp, winRate } = req.body;

        // 💡 Vercelの環境変数から安全にAPIキーを読み込む（ブラウザには絶対見えない）
        const apiKey = process.env.GEMINI_API_KEY;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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

        // サーバー側からGoogle APIを叩く
        const googleResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await googleResponse.json();
        const aiText = data.candidates[0].content.parts[0].text;

        // 結果をフロント（index.html）に返す
        return res.status(200).json({ text: aiText });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}