import { DotLottie } from '@/components/DotLottie';

export async function BusSkeleton() {
    return (
        <div style={{ width: '320px', height: '320px', margin: '0 auto' }}>
            <DotLottie src="/bus.lottie" width="320px" height="320px" />
        </div>
    );
} 