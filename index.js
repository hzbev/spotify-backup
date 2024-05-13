var SpotifyWebApi = require('spotify-web-api-node');
let axios = require("axios")
let fs = require("fs")


var spotifyApi = new SpotifyWebApi()
let token = "spotify token here"
spotifyApi.setAccessToken(token);

restore()
// createBack()

async function createBack() {
    let playlists = { own: [], liked: [], likedSongs: [] }
    let userInfo = await spotifyApi.getMe()
    let info = await spotifyApi.getMySavedTracks({offset: 0, limit: 50})
    for (let i of info.body.items) {
        playlists.likedSongs.push(i.track.uri)
    }
    let crun = true;
    let offset = 50
    if (info.body.next == null) crun = false
    while (crun) {
        let tmpinfo = await spotifyApi.getMySavedTracks({offset: offset, limit: 50})
        offset += 50
        if (tmpinfo.body.next == null) crun = false
        for (let i of tmpinfo.body.items) {
            playlists.likedSongs.push(i.track.uri)
        }
    }
    let res = await spotifyApi.getUserPlaylists()
    for (let i of res.body.items) {
        if (i.owner.display_name !== userInfo.body.display_name) playlists.liked.push(i)
        else {
            i["songs"] = await checkplaylist(i.id)
            playlists.own.push(i)
        }
    }
    fs.writeFileSync("backup.json", JSON.stringify(playlists))
}


async function restore() {
    let data = JSON.parse(fs.readFileSync("backup.json", "utf-8"))
    for (let a of data.own) {
        let tt = await spotifyApi.createPlaylist(a.name, { 'public': false })
        for (let i of chunkArray(a.songs, 100)) {
            console.log()
            await spotifyApi.addTracksToPlaylist(tt.body.id, i)
        }
    }

    for (let a of data.liked) {
        try {
            await spotifyApi.followPlaylist(a.id)
        } catch (error) {
            
        }
    }

    data.likedSongs.reverse()
    for (let i of chunkArray(data.likedSongs, 50)) {
        await spotifyApi.addToMySavedTracks(i)
    }
}


async function checkplaylist(id) {
    let songs = []
    let crun = true;
    let info = await spotifyApi.getPlaylist(id)
    if (info.body.tracks.next == null) crun = false
    let next_page = info.body.tracks.next
    for (let i of info.body.tracks.items) {
        songs.push(i.track.uri)
    }
    while (crun) {
        let res = await axios({
            method: 'get',
            maxBodyLength: Infinity,
            url: next_page,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        if (res.data.next == null) crun = false
        next_page = res.data.next
        for (let i of res.data.items) {
            songs.push(i.track.uri)
        }
    }
    return songs
}


function chunkArray(array, chunkSize) {
    if (!Array.isArray(array) || array.length === 0 || !Number.isInteger(chunkSize) || chunkSize <= 0) {
        return [];
    }
    const numChunks = Math.ceil(array.length / chunkSize);
    const chunkedArray = [];
    for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        chunkedArray.push(array.slice(start, end));
    }
    return chunkedArray;
}