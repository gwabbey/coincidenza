import * as cheerio from 'cheerio';

export async function GET(request) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        const response = await fetch(`https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?placeId=${id}&arrivals=False`);
        const $ = cheerio.load(await response.text());

        const trains = [];

        const alerts = $('#barraInfoStazioneId > div').find('div[class="marqueeinfosupp"] div').text();

        $('#bodyTabId > tr').each((index, element) => {
            const company = $(element).find('td[id="RVettore"] img').attr('alt');
            const category = $(element).find('td[id="RCategoria"] img').attr('src');
            const trainNumber = $(element).find('td[id="RTreno"]').text().trim();
            const destination = $(element).find('td[id="RStazione"] div').text().trim();
            const departureTime = $(element).find('td[id="ROrario"]').text().trim();
            const delay = $(element).find('td[id="RRitardo"]').text().trim() || 'Nessuno';
            const platform = $(element).find('td[id="RBinario"] div').text().trim();
            const departing = $(element).find('td[id="RExLampeggio"] img').length > 0;
            const stops = $(element).find('.FermateSuccessivePopupStyle .testoinfoaggiuntive').first().text().trim();
            let additionalInfo = $(element).find('.FermateSuccessivePopupStyle .testoinfoaggiuntive').last().text().trim();

            if (!id) {
                return;
            }

            if (stops === additionalInfo) {
                additionalInfo = {}
            }

            if (trainNumber && destination && departureTime && platform) {
                trains.push({
                    company,
                    category,
                    trainNumber,
                    destination,
                    departureTime,
                    delay,
                    platform,
                    departing,
                    stops,
                    additionalInfo,
                });
            }
        });

        console.log(alerts)

        return new Response(JSON.stringify({trains, alerts}), {
            status: 200,
            headers: {'Content-Type': 'application/json'},
        });
    } catch (error) {
        return new Response(JSON.stringify({error: error.message}), {status: 500});
    }
}