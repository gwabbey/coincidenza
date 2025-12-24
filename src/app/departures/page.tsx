import Search from "./search";

export default function Page() {
    return (
        <div className="flex flex-col gap-4 text-center">
            <h1 className="text-2xl font-bold">Partenze bus e treni</h1>
            <Search />
        </div>
    );
}