require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

const app = express();

// 商品データ (サーバーサイドで管理)
const products = [
    {
        id: 'prod_1',
        name: 'どこでもいっしょ トロ型スーパーDXクッション',
        price: 77777, // 円単位
        description: 'トロと一緒にゴロゴロできるにゃよ。',
        image: 'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/dr000/auc0510/user/07d62384d85995730e8b311ce39b86e218a6d44a24c13ed68569a0235265c74d/i-img1200x1200-17285735876204nsylhf43675.jpg'
    },
    {
        id: 'prod_2',
        name: 'どこでもいっしょクロTシャツ',
        price: 3777, // 円単位
        description: 'どこでもクロと一緒にゃよ。',
        image: 'https://www.cospa.com/images/items/pc/107228.jpg'
    },
    {
        id: 'prod_3',
        name: 'ピーエル フィギアマスコット',
        price: 3777, // 円単位
        description: 'まちおぼうけ中だワン',
        image: 'https://m.media-amazon.com/images/I/51JOe+ClUpL._AC_UF894,1000_QL80_.jpg'
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
    const { cart } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ error: 'Cart is empty or invalid' });
    }

    try {
        const line_items = cart.map(item => {
            const product = products.find(p => p.id === item.id);
            if (!product) {
                throw new Error(`Product with id ${item.id} not found`);
            }
            return {
                price_data: {
                    currency: 'jpy',
                    product_data: {
                        name: product.name,
                        images: [product.image],
                    },
                    unit_amount: product.price,
                },
                quantity: item.quantity,
            };
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: line_items,
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
