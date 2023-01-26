type GetCurrentUserResponse = {
  data: {
    user: {
      editor_of: Array<{
        user: {
          connections: Array<{
            id: string;
            display_name: string;
            emote_set_id: string;
          }>;
        };
      }>;
    };
  };
};

type Emote = {
  id: string;
  name: string;
};

type GetEmoteSetResponse = {
  data: {
    emoteSet: {
      emotes: Emote[];
    };
  };
};

function find_emote_set_by_channel(
  channel: string,
  { data }: GetCurrentUserResponse,
): string {
  for (const { user: { connections } } of data.user.editor_of) {
    const connection = connections.find((c) => c.display_name === channel);

    if (connection?.emote_set_id) {
      return connection.emote_set_id;
    }
  }

  throw new Error(`Could not find emote set for channel "${channel}"`);
}

function request(body: unknown) {
  const api_url = "https://7tv.io/v3/gql";

  const token = localStorage.getItem("7tv-token");

  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };

  const method = "POST";

  return fetch(api_url, {
    method,
    headers,
    body: JSON.stringify(body),
  });
}

async function get_channel_emote_set_id(channel: string): Promise<string> {
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
    `,
  });

  const json: GetCurrentUserResponse = await response.json();

  return find_emote_set_by_channel(channel, json);
}

async function get_emotes_in_set(set_id: string): Promise<Emote[]> {
  const response = await request({
    operationName: "GetEmoteSet",
    variables: {
      id: set_id,
    },
    query: `
      query GetEmoteSet($id: ObjectID!, $formats: [ImageFormat!]) {
        emoteSet(id: $id) {
          emotes {
            id
            name
          }
        }
      }
    `,
  });

  const json: GetEmoteSetResponse = await response.json();

  return json.data.emoteSet.emotes;
}

function add_emote(dest_set_id: string, emote: Emote) {
  return request({
    operationName: "ChangeEmoteInSet",
    variables: {
      action: "ADD",
      id: dest_set_id,
      emote_id: emote.id,
      name: emote.name,
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
    `,
  });
}

export async function emote_adder(
  /** ID of emote set to add emotes from */
  src_emote_set_id: string,
  /** Name of Twitch channel to add the emotes to */
  dest_channel_display_name: string,
  /** Use on your own risk (run add requests in parallel) */
  hardcore_mode = false,
) {
  const emote_set_id = await get_channel_emote_set_id(
    dest_channel_display_name,
  );

  const emotes = await get_emotes_in_set(src_emote_set_id);

  if (hardcore_mode) {
    const promises = emotes.map((emote) => add_emote(emote_set_id, emote));
    await Promise.allSettled(promises);
  } else {
    for (const emote of emotes) {
      await add_emote(emote_set_id, emote);
    }
  }
}
