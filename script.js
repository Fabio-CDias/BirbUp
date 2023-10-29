var map = L.map('map').setView([26.35, -17.58], 1.5);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
var markerGroup = [];

function audioPlayer(url){           
    const audioElement = document.getElementById("audioPlayer");
    audioElement.setAttribute('controls', 'true');
    audioElement.setAttribute('src', url);
}

async function apiQuery(url){
    try{
        const response = await fetch(url);
        if (!response.ok){
            throw new Error(response.status);
        }
        else{
            return await response.json();
        }
    }
    catch(error){
        console.error("Error while fetching information",error);
        return 'NotFound'
    }
}
  
   class Bird{
        constructor(id,images,sound,coordinate){
            this.index = 0;
            this.id = id;
            this.images = images;
            this.sound = sound;
            this.coordinate = coordinate;
        }
    }
    
    function birdNest(json){
        var birds = [];
        for (const elem of json.results){
            var images = [];
            for (image of elem.observation_photos){
                let url = image.photo.url;
                url = url.replace("square","medium");
                images.push(url);
            }
            if ( elem.sounds.length > 0){
                var sound = elem.sounds[0].file_url;
            }
            else{
                var sound = "NoSound";
            }
            let birdie = new Bird(elem.id,images,sound,[elem.geojson.coordinates[0],elem.geojson.coordinates[1]]);
            birds.push(birdie);
        }
        return birds;
    }
    
    async function genBirdList(name){
        const species = await getSpecies(name);
        const line = document.getElementById("birdslist");

        line.innerHTML = "";

        for (const elem of species){
            var newSpecie = document.createElement("li");
            newSpecie.id = "specie-line"
            newSpecie.textContent=elem.name;
            var defaultImageSquare = document.createElement("img");
            defaultImageSquare.id = "square-img";
            defaultImageSquare.src = elem.default_photo.square_url;
            
            newSpecie.appendChild(defaultImageSquare);
            line.appendChild(newSpecie);

            let currentBird= null;
            
            // Event Listener for when clicking on the specie on the left panel species list
            newSpecie.addEventListener("click",async function(){
                
                // Fetch all observations about an specific specie, that was clicked.
                // All the info about that observation.
                const birdSpecie = await getObservations(elem.name);
                
                // Ajust the relevant info, select only observation_photos, sound, geoJson
                // that are specific to the observation, not to species in general.
                const observations = birdNest(birdSpecie);
        
                
                
                document.getElementById("bird-image").src = elem.default_photo.medium_url;
                document.getElementById("scientific").textContent = "Scientific Name: "+elem.name;
                document.getElementById("common").textContent = "Common Name: "+elem.preferred_common_name;
                if (elem.wikipedia_url != null){
                    document.getElementById("wiki").href = elem.wikipedia_url;
                    document.getElementById("wiki").innerHTML = "Wikipedia: "+elem.name;
                }else{
                    document.getElementById("wiki").innerHTML = "";
                }

                const previous = document.getElementById("previous");
                const next = document.getElementById("next");
                removeMarker();
                
                map.setView([observations[0].coordinate[1],observations[0].coordinate[0]], 2);
                
                
                removeMarker();

                // For each observation fetched, populate the map with pinpoints
                // and for each pinpoint add event loop for click action
                for (const bird of observations){
                    const marker = L.marker([bird.coordinate[1],bird.coordinate[0]]);
                    markerGroup.push(marker);
                    marker.addEventListener("click",markerEvent(bird));
                
                }
                
                addMarker();
                
                function addMarker(){
                    for (m of markerGroup){
                        m.addTo(map);
                    }
                }
                function removeMarker(){
                    for (const m of markerGroup){
                        map.removeLayer(m);
                    }
                    markerGroup.length=0;
                }
                
                function markerEvent(bird){
                  
                    return function(){
                        if (currentBird) {
                            currentBird.previous.removeEventListener("click", currentBird.previousEvent);
                            currentBird.next.removeEventListener("click", currentBird.nextEvent);
                        }
                        
                         console.log(bird.id,bird.index,bird.images.length);
                        
                        function updateImage(src){
                            const imgElement = document.getElementById("bird-image");
                            imgElement.src=src;
                            if (!imgElement){
                                const newImg = new Image();
                                newImg.id = "bird-image";
                                newImg.src = src;
                                document.getElementById("img-box").appendChild(newImg);
                            }
                            else{
                                imgElement.src=src;
   
                            }
                        }
                        
                        function previousEvent(){
                            document.getElementById("bird-image").src = "";
                            bird.index = (bird.index  - 1 + bird.images.length) % bird.images.length;
                            updateImage(bird.images[bird.index]);
                            console.log(bird.id,bird.index,bird.images.length);

                        }
                        
                        function nextEvent(){
                            document.getElementById("bird-image").src = "";
                            bird.index = (bird.index + 1) % bird.images.length;
                            updateImage(bird.images[bird.index]);
                            console.log(bird.id,bird.index,bird.images.length);


                        }
                        currentBird = {
                            previous: previous,
                            next: next,
                            previousEvent: previousEvent,
                            nextEvent: nextEvent,
                        };
          
                        previous.addEventListener("click",previousEvent);
                        next.addEventListener("click",nextEvent);
                        updateImage(bird.images[bird.index]);
                        audioPlayer(bird.sound);
   
                 
                    }       
                } 
            });
        }
    }       
    
    async function getObservations(specie){
        const url_specie_sound = `https://api.inaturalist.org/v1/observations?per_page=200&geo=true&photos=true&sounds=true&taxon_name=${specie}&iconic_taxa=Aves&identifications=most_agree&quality_grade=research&order=desc&order_by=votes`;
        var response = await apiQuery(url_specie_sound);
        if (response.results.length > 0){
            return response;
        }
        else{
            const url_specie_no_sound = `https://api.inaturalist.org/v1/observations?per_page=200&geo=true&photos=true&taxon_name=${specie}&iconic_taxa=Aves&identifications=most_agree&quality_grade=research&order=desc&order_by=votes`;
            var response = await apiQuery(url_specie_no_sound);
            return response;
        }
    }
    async function getSpecies(name){
        const url_taxa = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${name}&per_page=100&rank_level=5`;
        const response = await apiQuery(url_taxa);
        const avesResults = response.results.filter((result) => result.iconic_taxon_name === "Aves");
        return avesResults;
    }
    
    function inputBox(){
        document.getElementById('sendtext').addEventListener('submit', async function (event) {
            event.preventDefault(); // Prevent the default form submission behavior
            const search = document.getElementById('query').value;
            document.getElementById('query').value = "";
            await genBirdList(search);
        });
    }
    inputBox();