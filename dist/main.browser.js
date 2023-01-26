// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

function find_emote_set_by_channel(channel, { data  }) {
    for (const { user: { connections  }  } of data.user.editor_of){
        const connection = connections.find((c)=>c.display_name === channel);
        if (connection?.emote_set_id) {
            return connection.emote_set_id;
        }
    }
    throw new Error(`Could not find emote set for channel "${channel}"`);
}
function request(body) {
    const api_url = "https://7tv.io/v3/gql";
    const token = localStorage.getItem("7tv-token");
    const headers = {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
    };
    const method = "POST";
    return fetch(api_url, {
        method,
        headers,
        body: JSON.stringify(body)
    });
}
async function get_channel_emote_set_id(channel) {
    const response = await request({
        operationName: "GetCurrentUser",
        variables: {},
        query: `
      query GetCurrentUser {
        user: actor {
          editor_of {
            user {
              connections {
                id
                display_name
                emote_set_id
              }
            }
          }
        }
      }
    `
    });
    const json = await response.json();
    return find_emote_set_by_channel(channel, json);
}
async function get_emotes_in_set(set_id) {
    const response = await request({
        operationName: "GetEmoteSet",
        variables: {
            id: set_id
        },
        query: `
      query GetEmoteSet($id: ObjectID!) {
        emoteSet(id: $id) {
          emotes {
            id
            name
          }
        }
      }
    `
    });
    const json = await response.json();
    return json.data.emoteSet.emotes;
}
function add_emote(dest_set_id, emote) {
    return request({
        operationName: "ChangeEmoteInSet",
        variables: {
            action: "ADD",
            id: dest_set_id,
            emote_id: emote.id,
            name: emote.name
        },
        query: `
      mutation ChangeEmoteInSet($id: ObjectID!, $action: ListItemAction!, $emote_id: ObjectID!, $name: String) {
        emoteSet(id: $id) {
          id
          emotes(id: $emote_id, action: $action, name: $name) {
            id
            name
          }
        }
      }
    `
    });
}
async function emote_adder(src_emote_set_id, dest_channel_display_name, hardcore_mode = false) {
    const emote_set_id = await get_channel_emote_set_id(dest_channel_display_name);
    const emotes = await get_emotes_in_set(src_emote_set_id);
    if (hardcore_mode) {
        const promises = emotes.map((emote)=>add_emote(emote_set_id, emote));
        await Promise.allSettled(promises);
    } else {
        for (const emote of emotes){
            await add_emote(emote_set_id, emote);
        }
    }
}
if (typeof window !== "undefined") {
    window.emote_adder = emote_adder;
}

