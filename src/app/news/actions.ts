'use server';

import fs from 'fs/promises';
import matter from 'gray-matter';
import path from 'path';
import { cache } from 'react';

export interface BlogPost {
    slug: string;
    title: string;
    description: string;
    date: string;
    readingTime: string;
    category: string;
    content?: string;
}

const POSTS_DIRECTORY = path.join(process.cwd(), 'content/blog');

const calculateReadingTime = (content: string): string => {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min di lettura`;
};

export const getPosts = cache(async (): Promise<BlogPost[]> => {
    try {
        const files = await fs.readdir(POSTS_DIRECTORY);
        const posts = await Promise.all(
            files
                .filter(file => file.endsWith('.md'))
                .map(async file => {
                    const filePath = path.join(POSTS_DIRECTORY, file);
                    const fileContent = await fs.readFile(filePath, 'utf8');
                    const { data, content } = matter(fileContent);
                    const slug = file.replace(/\.md$/, '');

                    return {
                        slug,
                        title: data.title,
                        description: data.description,
                        date: data.date,
                        category: data.category,
                        readingTime: calculateReadingTime(content),
                    };
                })
        );

        return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        console.error('Error reading blog posts:', error);
        return [];
    }
});

export const getPost = cache(async (slug: string): Promise<BlogPost | null> => {
    try {
        const filePath = path.join(POSTS_DIRECTORY, `${slug}.md`);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const { data, content } = matter(fileContent);

        return {
            slug,
            title: data.title,
            description: data.description,
            date: data.date,
            category: data.category,
            readingTime: calculateReadingTime(content),
            content,
        };
    } catch (error) {
        console.error(`Error reading blog post ${slug}:`, error);
        return null;
    }
}); 