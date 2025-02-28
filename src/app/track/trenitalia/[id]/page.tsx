export default async function Page({ params }: {
    params: Promise<{ id: string }>
}) {
    const id = (await params).id;
    // const trip = await getTripDetails(id);

    return <div>Trip</div>;
}