require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

const app = express();

// 商品データ (サーバーサイドで管理)
const products = [
    {
        id: 'prod_1',
        name: '高機能コーヒードリッパー',
        price: 3500, // 円単位
        description: '誰でも簡単にプロの味を再現できる、最新技術を詰め込んだドリッパーです。',
        image: 'https://images.unsplash.com/photo-1511920183353-3c712b79c278?q=80&w=1974&auto=format&fit=crop'
    },
    {
        id: 'prod_2',
        name: 'プレミアムコーヒー豆 (200g)',
        price: 2200, // 円単位
        description: 'フルーティーな香りとすっきりとした後味が特徴の、最高品質のアラビカ種です。',
        image: 'https://images.unsplash.com/photo-1559028006-44a3a9943364?q=80&w=2070&auto=format&fit=crop'
    }
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 商品リストを取得するAPI
app.get('/api/products', (req, res) => {
    res.json(products);
});

// Stripe Checkoutセッションを作成するAPI
app.post('/create-checkout-session', async (req, res) => {
    const { productId } = req.body;

    const product = products.find(p => p.id === productId);

    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'jpy',
                        product_data: {
                            name: product.name,
                            images: [product.image],
                        },
                        // 価格はセント単位で渡す (例: 3500円 -> 3500)
                        // Stripe APIの最新の挙動では、JPYの場合、セントではなく円の値をそのまま渡します。
                        unit_amount: product.price,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `http://localhost:3000/success.html`,
            cancel_url: `http://localhost:3000/cancel.html`,
        });

        res.json({ url: session.url });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
