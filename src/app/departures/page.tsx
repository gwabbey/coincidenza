import Search from "./search";
import {Metadata} from 'next';

export const metadata: Metadata = {
    title: "partenze bus e treni | coincidenza", description: "consulta le partenze dei bus e dei treni in tempo reale"
};

export default function Page() {
    return (<div className="flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold">Partenze bus e treni</h1>
        <Search />
    </div>);
}