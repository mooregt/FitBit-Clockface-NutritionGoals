import * as messaging from "messaging"; 
import { settingsStorage } from "settings"; 
import { me as companion } from "companion"; 
 
let updateInterval = null; 
const MILLISECONDS_PER_MINUTE = 1000 * 60; 
 
function GetUrlsForDate(date) 
{ 
  let formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; //YYYY-MM-DD 
 
  return { 
    FitbitFoodsLogDate: `https://api.fitbit.com/1/user/-/foods/log/date/${formattedDate}.json`, 
    FitbitFoodsLogWaterDate: `https://api.fitbit.com/1/user/-/foods/log/water/date/${formattedDate}.json`, 
    FitbitFoodsLogWaterGoal: `https://api.fitbit.com/1/user/-/foods/log/water/goal.json` 
  } 
} 
 
function FetchCaloriesConsumed(accessToken)  { 
  let date = new Date(); 
  let urls = GetUrlsForDate(date); 
 
  fetch(urls.FitbitFoodsLogDate, { 
    method: "GET", 
    headers: { 
      "Authorization": `Bearer ${accessToken}` 
    } 
  }) 
  .then(function(res) { 
    return res.json(); 
  }) 
  .then(function(data) { 
    let myData = { 
      caloriesConsumed: data.summary.calories 
    } 
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) { 
      messaging.peerSocket.send(myData); 
    } 
  }) 
  .catch(err => console.log('[FETCH]: ' + err)); 
} 
 
function FetchWaterConsumed(accessToken)  { 
  let date = new Date(); 
  let urls = GetUrlsForDate(date); 
 
  fetch(urls.FitbitFoodsLogWaterDate, { 
    method: "GET", 
    headers: { 
      "Authorization": `Bearer ${accessToken}` 
    } 
  }) 
  .then(function(res) { 
    return res.json(); 
  }) 
  .then(function(data) { 
    let myData = { 
      waterConsumed: data.summary.water 
    } 
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) { 
      messaging.peerSocket.send(myData); 
    } 
  }) 
  .catch(err => console.log('[FETCH]: ' + err)); 
} 
 
function FetchWaterGoal(accessToken)  { 
  let date = new Date(); 
  let urls = GetUrlsForDate(date); 
 
  fetch(urls.FitbitFoodsLogWaterGoal, { 
    method: "GET", 
    headers: { 
      "Authorization": `Bearer ${accessToken}` 
    } 
  }) 
  .then(function(res) { 
    return res.json(); 
  }) 
  .then(function(data) { 
    let myData = { 
      waterGoal: data.goal.goal 
    } 
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) { 
      messaging.peerSocket.send(myData); 
    } 
  }) 
  .catch(err => console.log('[FETCH]: ' + err)); 
} 
 
function RestoreSettings() { 
  for (let index = 0; index < settingsStorage.length; index++) { 
    let key = settingsStorage.key(index); 
    if (key && key === "oauth") { 
      let data = JSON.parse(settingsStorage.getItem(key)) 
      Main(data.access_token); 
    } 
  } 
} 
 
settingsStorage.onchange = evt => { 
  if (evt.key === "oauth") { 
    let data = JSON.parse(evt.newValue);
    Main(data.access_token); 
  } 
}; 
 
messaging.peerSocket.onopen = () => { 
  RestoreSettings(); 
}; 
 
function Main(accessToken) { 
  console.log('[INFO]: Running data update with access token: ' + accessToken) 
  FetchCaloriesConsumed(accessToken); 
  FetchWaterConsumed(accessToken); 
  FetchWaterGoal(accessToken); 
} 
 
function doSync() { 
  let oauth = settingsStorage.getItem("oauth"); 
  if (!oauth) { 
    console.error("[ERROR]: OAuth settings missing. Cannot sync data."); 
    return; 
  } 
 
  let tokenData = JSON.parse(oauth); 
  let accessToken = tokenData.access_token; 
  let refreshToken = tokenData.refresh_token; 
  Main(accessToken, () => { 
    console.log("[INFO]: Access token is valid."); 
  }, () => { 
    console.warn("[WARN]: Access token invalid or expired. Attempting refresh..."); 
    RefreshAccessToken(refreshToken, (newAccessToken) => { 
      console.log("[INFO]: Successfully refreshed token."); 
      Main(newAccessToken); 
    }, () => { 
      console.error("[ERROR]: Token refresh failed. User reauthorization required."); 
    }); 
  }); 
} 
 
if (companion.launchReasons.wokenUp){ 
  console.log('[INFO]: Companion woke up.') 
  doSync(); 
} 
 
function RefreshAccessToken(refreshToken, onSuccess, onError) { 
  const url = "https://api.fitbit.com/oauth2/token"; 
  const clientId = "";
  const clientSecret = "";
 
  const params = new URLSearchParams(); 
  params.append("grant_type", "refresh_token"); 
  params.append("refresh_token", refreshToken); 
 
  const headers = { 
    "Authorization": "Basic " + btoa(`${clientId}:${clientSecret}`), 
    "Content-Type": "application/x-www-form-urlencoded", 
  }; 
 
  fetch(url, { 
    method: "POST", 
    headers: headers, 
    body: params.toString(), 
  }) 
    .then((response) => { 
      if (!response.ok) { 
        throw new Error(`HTTP ${response.status}: ${response.statusText}`); 
      } 
      return response.json(); 
    }) 
    .then((data) => { 
      console.log("[INFO]: Token refreshed successfully."); 
      settingsStorage.setItem( 
        "oauth", 
        JSON.stringify({ 
          access_token: data.access_token, 
          refresh_token: data.refresh_token, 
          expires_in: data.expires_in, 
        }) 
      ); 
      if (onSuccess) onSuccess(data.access_token); 
    }) 
    .catch((err) => { 
      console.error(`[ERROR]: Token refresh failed - ${err.message}`); 
      if (onError) onError(err); 
    }); 
}