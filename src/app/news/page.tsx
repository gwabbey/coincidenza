import { getPosts } from './actions';
import { Posts } from './posts';

export default async function News() {
    const posts = await getPosts();

    return (
        <div className="flex flex-col gap-4 text-center">
            <h1 className="text-2xl font-bold">aggiornamenti sul progetto</h1>
            <Posts posts={posts} />
        </div>
    );
} 