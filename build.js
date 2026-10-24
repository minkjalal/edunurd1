// Connection: build.js is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Bundles the React entry point and source styles into the browser bundle with esbuild.
/**
 * EduNerd - Production Build Script
 * =================================
 * Bundles React components into public/bundle.js using esbuild.
 * Ensures cross-platform consistency for environment variable definitions.
 */

const esbuild = require("esbuild");
const path = require("path");

const isWatch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: [path.join(__dirname, "src", "index.jsx")],
  bundle: true,
  outfile: path.join(__dirname, "public", "bundle.js"),
  minify: false,
  sourcemap: "inline",
  loader: {
    ".js": "jsx",
    ".jsx": "jsx"
  },
  nodePaths: (process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean),
  define: {
    "process.env.NODE_ENV": JSON.stringify(isWatch ? "development" : "production")
  }
};

if (isWatch) {
  esbuild.context(buildOptions).then(ctx => {
    ctx.watch();
    console.log("⚡ Watching src/ for changes...");
  }).catch(err => {
    console.error("Watch build failed:", err);
    process.exit(1);
  });
} else {
  esbuild.build(buildOptions).then(() => {
    console.log("✅ Build completed successfully -> public/bundle.js");
  }).catch(err => {
    console.error("Build failed:", err);
    process.exit(1);
  });
}
