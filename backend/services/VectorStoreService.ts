export interface MemoryChunk {
    content: string;
    vector: number[];
}

export interface ScoredDoc {
    content: string;
    score: number;
}

export class VectorStoreService {
    private chunks: MemoryChunk[] = [];

    // Nạp toàn bộ dữ liệu (từ upload mới hoặc từ DB)
    public setChunks(newChunks: MemoryChunk[]): void {
        this.chunks = newChunks;
    }

    public getChunks(): MemoryChunk[] {
        return this.chunks;
    }

    public get count(): number {
        return this.chunks.length;
    }

    // Thuật toán Cosine Similarity
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // Tìm kiếm Top K đoạn văn sát nhất với câu hỏi
    public findTopK(questionVector: number[], k: number = 3): ScoredDoc[] {
        const scoredDocs = this.chunks.map(chunk => ({
            content: chunk.content,
            score: this.cosineSimilarity(questionVector, chunk.vector)
        }));

        scoredDocs.sort((a, b) => b.score - a.score);
        return scoredDocs.slice(0, k);
    }
}