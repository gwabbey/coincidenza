'use client'

import dynamic from 'next/dynamic'
import { Header } from './header'

const Providers = dynamic(() => import('./providers'), { ssr: false })

export default function Root({ children }: { children: React.ReactNode }) {
    return (
        <Providers>
            <Header />
            <main className="p-4">{children}</main>
        </Providers>
    )
}