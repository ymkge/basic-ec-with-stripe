# Stripe決済付き 基本的なECサイト

これは、Node.js, Express, Stripe Checkout を使用して構築された、シンプルなECサイトのサンプルアプリケーションです。

## 概要

このアプリケーションは、いくつかの商品をリスト表示し、ユーザーが「購入する」ボタンをクリックするとStripeが提供する決済ページにリダイレクトして支払いを行うことができる、基本的なEC機能のデモンストレーションです。

## 主な機能

-   サーバーから動的に商品リストを読み込んで表示
-   Stripe Checkout と連携した決済機能
-   決済成功時・キャンセル時の結果表示ページ

## 技術スタック

-   **バックエンド**: Node.js, Express
-   **決済処理**: Stripe API
-   **フロントエンド**: HTML, CSS, JavaScript (ES6)
-   **その他**: `dotenv` (環境変数管理)

## セットアップと実行方法

### 1. 前提条件

-   [Node.js](https://nodejs.org/) (v14以降を推奨)
-   [Stripe](https://stripe.com/) アカウント

### 2. インストール

まず、このリポジトリをクローンします。

```bash
git clone https://github.com/your-username/basic-ec-with-stripe.git
cd basic-ec-with-stripe
```

次に、必要なnpmパッケージをインストールします。

```bash
npm install
```

### 3. 環境設定

StripeのAPIキーを設定する必要があります。プロジェクトのルートディレクトリに `.env` という名前のファイルを作成し、以下のように記述してください。

```
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
```

`sk_test_YOUR_SECRET_KEY` の部分を、ご自身のStripeテスト環境のシークレットキーに置き換えてください。キーは[Stripeダッシュボード](https://dashboard.stripe.com/test/apikeys)で確認できます。

### 4. アプリケーションの起動

以下のコマンドでサーバーを起動します。

```bash
npm start
```

コンソールに `Server is running on port 3000` と表示されれば成功です。

ブラウザで `http://localhost:3000` にアクセスしてください。

## アプリケーションの仕組み

1.  **商品表示**: ユーザーがトップページにアクセスすると、フロントエンドのJavaScriptがバックエンドの `/api/products` エンドポイントを呼び出し、商品情報を取得して画面に表示します。
2.  **決済開始**: ユーザーが「購入する」ボタンをクリックすると、フロントエンドは選択された商品のIDを `/create-checkout-session` エンドポイントにPOSTリクエストで送信します。
3.  **Checkoutセッション作成**: バックエンドサーバーはStripeのAPIを呼び出し、商品の価格やリダイレクト先URLを含む決済セッションを作成します。
4.  **リダイレクト**: バックエンドは作成されたセッションのURLをフロントエンドに返し、フロントエンドはユーザーをそのURL（Stripeの決済ページ）にリダイレクトします。
5.  **決済完了**: ユーザーが決済を完了すると、Stripeは `success_url` に指定されたページ (`/success.html`) にリダイレクトします。キャンセルした場合は `cancel_url` (`/cancel.html`) にリダイレクトされます。