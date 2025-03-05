'use client';

import Link from 'next/link';
import { BlogPost } from './actions';

export const BlogPosts = ({ posts }: { posts: BlogPost[] }) => (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        {posts.map((post, index) => (
            <Link href={`/news/${post.slug}`} key={index}>
                <div className="flex flex-row gap-4">
                    <span className="font-bold">{post.date}</span>
                    <span>{post.title}</span>
                </div>
            </Link>
        ))}
    </div>
);