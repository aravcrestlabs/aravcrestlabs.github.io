const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const EleventyEjsPlugin = require("@11ty/eleventy-plugin-ejs");

module.exports = function (eleventyConfig) {
    // Support EJS via Plugin (Eleventy 3.0+)
    eleventyConfig.addPlugin(EleventyEjsPlugin);

    // Copy Public Assets
    eleventyConfig.addPassthroughCopy({ "public": "." });

    return {
        dir: {
            input: "src",
            output: "dist",
            includes: "partials",
            layouts: "layouts",
            data: "_data"
        },
        templateFormats: ["ejs", "html", "md"],
        htmlTemplateEngine: "ejs",
        markdownTemplateEngine: "ejs"
    };
};
