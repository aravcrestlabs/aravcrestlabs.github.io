module.exports = {
    path: (data) => {
        // Use page.url which reflects the actual output URL depth
        // e.g. /legal/terms/ -> ../../
        // e.g. /docs/ -> ../
        // e.g. / -> (empty)

        const url = data.page.url || '/';

        // Count the depth by counting slashes (minus leading and trailing)
        // /legal/terms/ has 2 segments = depth 2 = ../../
        // /docs/ has 1 segment = depth 1 = ../
        // / has 0 segments = depth 0 = (empty)

        const segments = url.split('/').filter(s => s.length > 0);
        const depth = segments.length;

        if (depth === 0) return '';
        return '../'.repeat(depth);
    }
};
