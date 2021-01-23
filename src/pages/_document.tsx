import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document<{
  theme: "dark" | "light" | null;
}> {
  static async getInitialProps(ctx: any) {
    const theme = ctx.query?.theme
      ? ctx.query?.theme === "dark"
        ? "dark"
        : ctx.query?.theme === "light"
        ? "light"
        : null
      : null;

    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps, theme };
  }

  render() {
    return (
      <Html className={this.props.theme || ""}>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
