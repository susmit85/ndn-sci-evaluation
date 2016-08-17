I. Purpose
==========

     To measure the performance of publishing.


II. Topology
============

     Two catalogs. One is on lbl, and the other one is on sac.
     RTT between the two is 3ms (ping'ed)

     Publisher is on lbl, running in root account. (due to the fact of signing key saved in root)


III. Changes
============

     (1) Letting catalog print out the time of publishing request arrived on the first catalog and the time of applying changes

        a. Adding the code below in onPublishInterest() of catalog/src/publish/publish-adapter.hpp on lbl

            // print out the UTC time when receving the publish Interest
            std::chrono::milliseconds ms = std::chrono::duration_cast< std::chrono::milliseconds >(
              std::chrono::system_clock::now().time_since_epoch()
            );

            _LOG_INFO("!!!!!Time-to-get-the-publish-Interest-in-milisecs " << ms.count());

        b. Adding the code below at the end of processUpdateData() in catalog/src/publish/publish-adapter.hpp on sac

            // print out the UTC time when applying changes
            std::chrono::milliseconds ms = std::chrono::duration_cast< std::chrono::milliseconds >(
              std::chrono::system_clock::now().time_since_epoch()
            );

            _LOG_INFO("!!!!!Time-to-apply-the-changes-(milisecs) " << ms.count());

     (2) Changing the log4cxx.properties file, so it exclude most of the messages

        # or the log is named as catalog-lbl.log
        log4j.appender.rootFileAppender.File=catalog-sac.log
        
        # Change the log level to INFO, so later we can easily process it
        log4j.logger.QueryAdapter=INFO
        log4j.logger.PublishAdapter=INFO

     (3) Changing the cxx-producer.cpp, mute most of the messages (see cxx-producer.cpp)

     (4) Changing the catalog config file to use the signing key /cmip5/lbl/DataPublisher the trust anchor, this can reduce the signature verification to 1. More is possible, but will add some overhead.


IV. Adding scripts to run experiments for the various number of datasets
========================================================================

     (1) run-sync-test.sh

     (2) a bunch of txt files, which contain the list of dataset names


V. Run experiment
=================

     (1) Synchronizing experiment machines with fedora (http://www.cyberciti.biz/tips/synchronize-the-system-clock-to-network-time-protocol-ntp-under-fedora-or-red-hat-linux.html)

        sudo ntpdate pool.ntp.org

     (2) Setting up the NFD and catalog on both lbl and sac

        see run_ndn_services_sync_test.sh

     (3) run catalog

        /usr/local/bin/atmos-catalog -f /root/catalog/catalog_test.conf

     (4) run experiment

        sh run-sync-test.sh [name list file]

     (5) collect catalog (cp both the catalog.log from sac and lbl)

     (6) run parse-log.py to generate results for each experiment

     (7) run box-plot-adding.py or box-plot-removing.py to generate box-plot for the experiments


VI. Todo
========

    1. Integrating scripts

    2. Make the generated graph vector
