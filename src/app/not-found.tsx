export default function NotFound() {
    return (
        <div className="absolute inset-0 z-0 flex h-screen items-center justify-center pointer-events-none">
            <div className="pointer-events-auto text-center">
                <h1 className="text-4xl font-bold">errore</h1>
                <p className="text-2xl">pagina non trovata</p>
            </div>
        </div>
    );
}