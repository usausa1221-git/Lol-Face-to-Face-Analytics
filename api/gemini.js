export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 💡 新しい変数 myRole をフロントから受け取る
        const { myChamp, enemyChamp, winRate, isBotLane, mySupport, enemySupport, myRole } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'サーバーにGEMINI_API_KEYが設定されていません。' });
        }

        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        let matchupContext = "";
        if (isBotLane) {
            // 💡 プレイヤーのロールに応じたコーチングの強調指示を作成
            const roleInstructions = myRole === "support"
                ? `プレイヤーの担当ロールは【サポート（${mySupport}）】です。相方のADC（${myChamp}）をどのように保護・エンゲージ支援すべきか、視界管理やレーンコントロール、サポート専用アイテム（クエスト進化）の選択を最優先で解説してください。`
                : `プレイヤーの担当ロールは【ADC（${myChamp}）】です。味方サポート（${mySupport}）のCCやバフにどう合わせるか、安全なCSファームやダメージトレードの立ち回りを中心に解説してください。`;

            matchupContext = `
                【Botレーン（2vs2）マッチアップ条件】
                ・自分のチームのADC: ${myChamp}
                ・自分のチームのサポート: ${mySupport}
                ・相手チームのADC: ${enemyChamp}
                ・相手チームのサポート: ${enemySupport}
                ・この対面の統計勝率: ${winRate}%
                
                【最重要指示】
                ${roleInstructions}
                ADCとサポートのシナジー（コンボや相性）、2vs2でのキルラインやお互いのスキルの噛み合いを深く考慮してください。
            `;
        } else {
            matchupContext = `
                【ソロレーン（1vs1）マッチアップ条件】
                ・自分のチャンピオン: ${myChamp}
                ・相手のチャンピオン: ${enemyChamp}
                ・この対面の統計勝率: ${winRate}%
            `;
        }

        const prompt = `
            あなたはLeague of Legendsのプロコーチです。以下の条件におけるマッチアップの攻略情報をプレイヤーに提供してください。
            ${matchupContext}

            【出力ルール】
            必ず、以下のJSONフォーマットのキー名（skills, weaknesses, tactics, items）を持ったオブジェクトとして出力してください。
            プログラムで自動処理するため、余計な挨拶や解説テキストは絶対に含めず、純粋なマークダウンのJSONブロック（\`\`\`json 〜 \`\`\`）のみを返してください。各値は箇条書きのテキストにしてください。
            コアアイテムを記載する際は、アイテム名の直前にシステム用のアイテムIDを「#数字」の形式（例: #3031 無限の剣, #3865 世界の記憶）で必ず含めてください。

            {
                "skills": "相手マッチャアップの主要スキルの詳細や注意すべきコンボ・CCチェーン",
                "weaknesses": "相手側の構成（または単体）の明確な弱点、レベルやスキルCDなどの突くべきタイミング",
                "tactics": "指定されたロールの役割を果たすための、レーン戦・2vs2での戦い方、ガンク合わせ、集団戦での具体的な立ち回り",
                "items": "指定されたロールが買うべき、推奨コア装備や対面・相手チームを意識したカウンターアイテム"
            }
        `;

        const googleResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
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
            return res.status(googleResponse.status).json({ error: `Google API Error: ${data.error?.message || '不明なエラー'}` });
        }

        let aiText = data.candidates[0].content.parts[0].text.trim();
        if (aiText.startsWith("```json")) { aiText = aiText.replace(/^```json/, "").replace(/```$/, "").trim(); }

        const parsedData = JSON.parse(aiText);
        return res.status(200).json(parsedData);

    } catch (error) {
        return res.status(500).json({ error: `Server Error: ${error.message}` });
    }
}
