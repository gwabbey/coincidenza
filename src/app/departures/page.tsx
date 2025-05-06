import Search from "./search";

export default function Page() {
    return (
        <div className="flex flex-col gap-4 text-center">
            <h1 className="text-2xl font-bold">Consulta le partenze di una stazione</h1>
            <Search />
        </div>
    );
}