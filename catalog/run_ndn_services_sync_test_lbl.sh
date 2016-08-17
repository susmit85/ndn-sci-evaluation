ARG=$1
if [ $ARG == "start" ]; then
    timestamp=`date "+%Y-%m-%d-%H:%M:%S"`
    /usr/local/bin/nfd-start &>/tmp/nfd-"$timestamp".log
    sleep 3
    #/usr/local/bin/nlsr -d -f /root/NLSR/nlsr_lbl_sync_test.conf
    /usr/local/bin/nfdc register /catalog/sync/1D20A577FD661F12C2155074A7BE2260B6B3DB8E22F4684DA592DFA2877DDC5AC91A udp://atmos-sac.es.net
    /usr/local/bin/nfdc register /ndn/broadcast udp://atmos-sac.es.net
    nohup /usr/local/bin/ndn-repo-ng &
fi

if [ $ARG == "stop" ]; then
    /usr/local/bin/nfd-stop
fi
