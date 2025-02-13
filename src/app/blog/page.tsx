import { getPosts } from './actions';
import { BlogPosts } from './components';
export default async function Blog() {
    const posts = await getPosts();

    return (
        <div className="flex flex-col gap-4 text-center">
            <h1 className="text-4xl font-bold">blog</h1>
            <span>qualche pensiero ogni tanto</span>
            <BlogPosts posts={posts} />
        </div>
    );
} 