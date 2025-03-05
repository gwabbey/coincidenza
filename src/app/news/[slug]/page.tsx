
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPost } from '../actions';
import { BlogPostContent, BlogPostHeader } from './components';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const post = await getPost((await params).slug);

    if (!post) {
        notFound();
    }

    return {
        title: post.title,
    };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const post = await getPost((await params).slug);

    if (!post) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-4 items-start">
            <div className="flex flex-col gap-4">
                <h1 className="text-4xl font-bold">{post.title}</h1>
                {post.description && <p className="text-gray-500">{post.description}</p>}
                <BlogPostHeader post={post} />
            </div>
            <BlogPostContent post={post} />
        </div>
    );
} 