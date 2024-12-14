import document from "document";
import * as messaging from "messaging";
import clock from "clock";
import { preferences } from "user-settings";
import { today } from "user-activity";
import { HeartRateSensor } from "heart-rate";

function ZeroPad(i) {
  if (i < 10) {
    i = "0" + i;
  }
  return i;
}

clock.granularity = "minutes";
var calories = 0;
const hrm = new HeartRateSensor();

const dateLabel = document.getElementById("dateLabel");
const timeLabel = document.getElementById("timeLabel");
const calorieLabel = document.getElementById("calorieLabel");
const stepsLabel = document.getElementById("stepsLabel");
const heartRateLabel = document.getElementById("heartRateLabel");

clock.ontick = (evt) => {
  let todayDate = evt.date;
  let hours = todayDate.getHours();
  if (preferences.clockDisplay === "12h") {
    hours = hours % 12 || 12;
  } else {
    hours = ZeroPad(hours);
  }
  let mins = ZeroPad(todayDate.getMinutes());
  
  const caloriesBurned = today.adjusted.calories || 0;
  const steps = today.adjusted.steps || 0;

  dateLabel.text = `${todayDate.getDate()}/${todayDate.getMonth()}/${todayDate.getFullYear()}`;
  timeLabel.text = `${hours}:${mins}`;
  calorieLabel.text = `${calories} / ${caloriesBurned} CALS`;
  stepsLabel.text = `${steps} STEPS`;
}

hrm.onreading = () => {
  heartRateLabel.text = `${hrm.heartRate} HR`;
};

messaging.peerSocket.onmessage = evt => {
  console.log(evt.data.calories);
  calories = evt.data.calories;
};

hrm.start();