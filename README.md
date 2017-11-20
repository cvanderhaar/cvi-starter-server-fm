# IBM IoT for Automotive (IBM Cloud) - Fleet Management Starter Application

The IBM IoT for Automotive - Fleet Management Starter Application demonstrates how quickly you can build an app on IBM Cloud to manage and monitor a fleet of vehicles in real time.

## Overview

The Fleet Management Starter Application uses services in IBM Cloud to provide a sample solution for fleet operation management and personnel. By using the application, you can easily track and view the following information:

- Availability of a fleet of cars on a map
- Location of vehicles
- Overall health of the entire fleet
- Health diagnostics and conditions of a specific vehicle in the fleet
- Condition of vehicles by order of severity or risk
- Event history for the entire fleet
- Event history for a specific vehicle in the fleet

The Fleet Management Starter Application uses the following services that are available on IBM Cloud:

- [IoT for Automotive (Experimental)](https://console.ng.bluemix.net/catalog/services/iot-for-automotive/)
- [Cloudant NoSQL DB](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db/)

You can also use the Fleet Management Starter Application together with an instance of the IBM IoT for Automotive SaaS offering on IBM SoftLayer. For more information, see [IBM for Automotive (SaaS) - Fleet Management Starter Application](https://github.com/ibm-watson-iot/iota-starter-server-fm-saas ).

## Deploying the app on IBM Cloud

You can automatically deploy an instance of the Fleet Management Starter Application on IBM Cloud by clicking [![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/ibm-watson-iot/iota-starter-server-fm.git). You can also deploy the app manually. Note that you have to do the service activation step mentioned below after the automatic or manual deployment.

To manually deploy your own instance of the Fleet Management Starter Application on IBM Cloud, complete all of the following steps:

1. [Register][bluemix_signup_url] an account on IBM Cloud or use an existing valid account.
2. Download and install the [Cloud-foundry CLI][cloud_foundry_url] tool.
3. Clone the Fleet Management Starter Application to your local environment by using the following console command:

  ```
  git clone https://github.com/ibm-watson-iot/iota-starter-server-fm.git
  ```

4. Change to the directory that you created.
5. Edit the `manifest.yml` file and change the values of `<name>` and `<host>` to something unique.

  ```
  applications:
         :
    host: iota-starter-server-fleetmanagement
    name: iota-starter-server-fleetmanagement
    memory: 512M
    path: .
    instances: 1
         :
  ```
   The host value is used to generate your application URL, which is in the following syntax:
   `<host>.mybluemix.net`.

6. Install the NPM package by using the following command. The installer observes the dependencies that are specified in your `package.json` file.
  ```
  $ cd ./webclient
  $ npm install
  ```
7. Convert TypeScript to JavaScript:

  ```
  $ npm run tsc
  $ npm run gulp
  $ cd ..
  ```

8. By using the command line tool, connect to IBM Cloud and log in when prompted:

  ```
  $ cf api https://api.ng.bluemix.net
  $ cf login
  ```

9. Create an instance of the IBM IoT for Automotive service in IBM Cloud:

  ```
  $ cf create-service iotforautomotive free_shared FleetIoTForAuto
  ```

10. Create an instance of the Cloudant NoSQL DB service in IBM Cloud:

  ```
  $ cf create-service cloudantNoSQLDB Lite FleetCloudantDB
  ```

11. Push the starter app to IBM Cloud by using the following command. Because you will need to perform more steps when the app is deployed, you must add the option `--no-start` when you run the `push` command.

  ```
  $ cf push --no-start
  ```
Your very own instance of the IBM IoT for Automotive - Fleet Management Starter Application is now deployed on IBM Cloud.

## Activating the IBM Cloud services

Before you can use the IBM IoT for Automotive - Fleet Management Starter Application, you need to do the following tasks:

- [Activate the **IBM IoT for Automotive** service](#activate)
- [Configure authentication](#authent)

### <a name="activate"></a> Activating the IBM IoT for Automotive service

1. If the app is already running on IBM Cloud, stop the app.

2. Open the [IBM Cloud dashboard][bluemix_dashboard_url] in your browser.

3. Open the IBM IoT for Automotive service and then wait for a few seconds until the user credentials display.

### <a name="authent"></a> Configuring authentication

To secure the app, authentication is enabled by default for the IoT for Automotive - Fleet Management Starter Application. The default user credentials are as follows:

User name | Password
----- | -----
starter | Starter4Iot

- To change the user name or password that is used by the app, edit the values that are specified for the `APP_USER` and `APP_PASSWORD` environment variables.

- To remove authentication, set both the `APP_USER` and `APP_PASSWORD` environment variables to 'none'.

## <a name="run"></a> Starting the app

- To start the Fleet Management Starter Application, open the [IBM Cloud dashboard][bluemix_dashboard_url] and start the app.

Congratulations! You are now ready to use your own instance of the IBM IoT for Automotive - Fleet Management Starter Application. Open `http://<host>.mybluemix.net` in your browser.

## (Optional) Connecting to an OBDII dongle plugged in to your car

The starter app provides a mobile app to connect to an OBDII dongle plugged in to your car. The mobile app sends data from an OBDII dongle to the Fleet Management Starter Application via IoT Platform service and you can see the data in the app. Follow the steps below to enable this optional feature.

### Bind the IoT Platform service to the app

1. Open the [IBM Cloud dashboard][bluemix_dashboard_url] in your browser.

1. Open the IBM IoT for Automotive service.

1. Select **Connections** tab at the left navigation bar.

1. Click **Connect New**

1. Select *Internet of Things Platform* service and click *Create* to bind the service

### Create a device type for your device

When you start a mobile app for the first time, your device is registered to the IoT Platform service automatically with a device type __OBDII__. The device type needs to be prepared beforehand.

1. Launch the IoT Platform dashboard on IBM Cloud.

1. Open **Device** page

1. Open **Device Types** tab at top of the page

1. Click **+Create Type**

1. Click **Create device type**

1. Input 'OBDII' in **Name** field

1. Leave the other fields as default and click **Next** at the bottom right until a device type is created.

### Set up the OBDII Fleet Management App

Refer [IBM IoT for Automotive - OBDII Fleet Management App for Android](https://github.com/ibm-watson-iot/iota-starter-obd-android) to build and install a mobile app to your Android phone. Once you get ready to use it, start the mobile app on your phone.

### Connect the device to the IoT for Automotive service

When you start the mobile app for the first time, a device is registered automatically to the IoT Platform service that you have specified in the mobile app, and corresponding vehicle is created automatically when you connect your device to the IoT Platform. Now, your device is connected to the Fleet Management Starter Application. Go to **Map** or **Car Status** page in the app and see the status.

If you no longer need a device, go to IoT Platform dashboard and delete your device manually. Then, after you delete it, update vehicles in the IBM IoT for Automotive service as follows.

1. Open the Fleet Management Starter Application on your browser.

1. Select **Vehicle** tab at the left navigation bar.

1. Click **Sync with IoT Platform** at top right of the page.

A vehicle corresponding to deleted device must be removed from a table. Also, if you have added new device to IoT Platform manually, new vehicle is added to the table.

## Reporting defects
To report a defect with the IoT for Automotive - Mobility Starter Application mobile app, go to the [Issues section](https://github.com/ibm-watson-iot/iota-starter-server-fm/issues) section.

## Troubleshooting
To debug problems, check the IBM Cloud app logs. To view the logs, run the following command from the Cloud Foundry CLI:

  ```
  $ cf logs <application-name> --recent
  ```
For more information about how to troubleshoot your application, see the [Troubleshooting section](https://www.ng.bluemix.net/docs/troubleshoot/tr.html) in the IBM Cloud documentation.

## Privacy Notice

The IoT for Automotive - Fleet Management Starter Application includes code to track deployments to [IBM Cloud](https://www.bluemix.net/) and other Cloud Foundry platforms.

For each instance that you deploy, the following information is sent to a [Deployment Tracker](https://github.com/cloudant-labs/deployment-tracker) service:

* Application name (`application_name`)
* Space ID (`space_id`)
* Application version (`application_version`)
* Application URIs (`application_uris`)
* Labels of bound services
* Number of instances for each bound service

The tracked data is collected from the `VCAP_APPLICATION` and `VCAP_SERVICES` environment variables in IBM Cloud and other Cloud Foundry platforms. We use the data to track metrics around deployments of sample applications to IBM Cloud to measure the usefulness of our examples so that we can continuously improve the content that we offer to you. Only deployments of sample applications that include code to ping the Deployment Tracker service are tracked.

### Disabling deployment tracking

You can disable the Deployment Tracker service by removing `require("cf-deployment-tracker-client").track();` from the beginning of the `app.js` server file.

## Questions, comments or suggestions
For your questions, comments or suggestions to us, visit [Watson IoT for Automotive Application community site] (https://www.ibm.com/developerworks/community/groups/service/html/communitystart?communityUuid=3b06ca1c-fd7c-4a59-a888-e5e3a8384091).

## Useful links
- [IBM Cloud](https://bluemix.net/)
- [IBM Cloud Documentation](https://www.ng.bluemix.net/docs/)
- [IBM Cloud Developers Community](http://developer.ibm.com/bluemix)
- [IBM Watson Internet of Things](http://www.ibm.com/internet-of-things/)
- [IBM Watson IoT Platform](http://www.ibm.com/internet-of-things/iot-solutions/watson-iot-platform/)
- [IBM Watson IoT Platform Developers Community](https://developer.ibm.com/iotplatform/)

[bluemix_dashboard_url]: https://console.ng.bluemix.net/dashboard/
[bluemix_signup_url]: https://console.ng.bluemix.net/registration/
[cloud_foundry_url]: https://github.com/cloudfoundry/cli
