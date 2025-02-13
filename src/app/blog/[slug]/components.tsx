'use client';

import { Card } from '@heroui/react';
import Link from 'next/link';
import Markdown from 'react-markdown';
import { BlogPost } from '../actions';

export const BlogPostContent = ({ post }: { post: BlogPost }) => (
    <Card className="prose dark:prose-invert max-w-none p-4">
        <article>
            <Markdown
                components={{
                    h1: ({ children }) => <h1 className="text-4xl font-bold mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-3xl font-bold mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-2xl font-bold mb-2">{children}</h3>,
                    p: ({ children }) => <p className="mb-4">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    a: ({ href, children }) => (
                        <Link href={href ?? ''}>
                            {children}
                        </Link>
                    ),
                }}
            >
                {post.content}
            </Markdown>
        </article>
    </Card>
);

export const BlogPostHeader = ({ post }: { post: BlogPost }) => (
    <div className="flex flex-wrap items-center gap-4 text-sm">
        <span>{post.readingTime}</span>
        <span>•</span>
        <span>{new Date(post.date).toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).toLowerCase()}</span>
    </div>
); 