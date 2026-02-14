module.exports = {
    path: (data) => {
        // Use page.url which reflects the actual output URL depth
        // e.g. /legal/terms/ -> ../../
        // e.g. /docs/ -> ../
        // e.g. / -> (empty)

        const url = data.page.url;
        if (!url || url === '/') return '';

        const segments = url.split('/').filter(s => s.length > 0);
        const depth = segments.length;

        if (depth === 0) return '';
        return '../'.repeat(depth);
    }
};
