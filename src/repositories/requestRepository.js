/**
 * Lưu trạng thái của một batch convert.
 * Hiện dùng Map in-memory (đủ cho 1 instance API). Muốn chạy nhiều instance API
 * thì thay phần cài đặt bằng Redis hash; service/controller không phải sửa.
 */
const store = new Map();

module.exports = {
    async create(requestId, data) {
        store.set(requestId, { ...data, zipName: null, createdAt: Date.now() });
        return store.get(requestId);
    },

    async findById(requestId) {
        return store.get(requestId) || null;
    },

    async update(requestId, patch) {
        const current = store.get(requestId);
        if (!current) return null;
        Object.assign(current, patch);
        return current;
    },

    async remove(requestId) {
        store.delete(requestId);
    },
};
