import React, { ReactElement, useEffect, useState } from 'react'
import SearchBar from '../molecules/SearchBar'
import styles from './Home.module.css'
import AssetQueryList from '../organisms/AssetQueryList'
import { QueryResult } from '@oceanprotocol/lib/dist/node/metadatacache/MetadataCache'
import Container from '../atoms/Container'
import Loader from '../atoms/Loader'
import { useOcean } from '@oceanprotocol/react'
import Button from '../atoms/Button'
import Bookmarks from '../molecules/Bookmarks'
import axios from 'axios'
import { queryMetadata } from '../../utils/aquarius'
import { useStaticQuery, graphql } from 'gatsby'
import { DDO } from '@oceanprotocol/lib'
import { ewaiCheckResultsForSpamAsync } from '../../ewai/ewaifilter'
import { useEwaiInstance } from '../../ewai/client/ewai-js'
import { useSiteMetadata } from '../../hooks/useSiteMetadata'
import Alert from '../atoms/Alert'

function LoaderArea() {
  return (
    <div className={styles.loaderWrap}>
      <Loader />
    </div>
  )
}

function SectionQueryResult({
  title,
  query,
  action
}: {
  title: ReactElement | string
  query: any
  action?: ReactElement
}) {
  const { config } = useOcean()
  const [result, setResult] = useState<QueryResult>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!config?.metadataCacheUri) return

    const source = axios.CancelToken.source()

    async function init() {
      // TODO: remove any once ocean.js has nativeSearch typings
      const result = await queryMetadata(
        query as any,
        config.metadataCacheUri,
        source.token
      )
      let filteredResultsSet = false
      if (
        process.env.EWAI_CHECK_FOR_SPAM_ASSETS?.toLowerCase() === 'true' &&
        result?.results?.length > 0
      ) {
        const filteredResults = await ewaiCheckResultsForSpamAsync(result)
        setResult(filteredResults)
        filteredResultsSet = true
      }
      if (!filteredResultsSet) {
        setResult(result)
      }
      setLoading(false)
    }
    init()

    return () => {
      source.cancel()
    }
  }, [config?.metadataCacheUri, query])

  return (
    <section className={styles.section}>
      <h3>{title}</h3>
      {loading ? (
        <LoaderArea />
      ) : (
        result && <AssetQueryList queryResult={result} />
      )}
      {action && action}
    </section>
  )
}

export default function HomePage(): ReactElement {
  const ewaiInstance = useEwaiInstance()

  const queryHighest = {
    page: 1,
    offset: 9,
    query: {
      nativeSearch: 1,
      query_string: {
        query: `(service.attributes.additionalInformation.energyweb.ewai.instance:"${ewaiInstance.name}") && (price.type:pool) -isInPurgatory:true`
      }
    },
    sort: { 'price.ocean': -1 }
  }

  const queryLatest = {
    page: 1,
    offset: 9,
    query: {
      nativeSearch: 1,
      query_string: {
        query: `(service.attributes.additionalInformation.energyweb.ewai.instance:"${ewaiInstance.name}") -isInPurgatory:true`
      }
    },
    sort: { created: -1 }
  }

  const { warning } = useSiteMetadata()

  return (
    <>
      <Alert text={warning} state="info" />
      <Container narrow className={styles.searchWrap}>
        <SearchBar size="large" />
      </Container>

      <section className={styles.section}>
        <h3>Bookmarks</h3>
        <Bookmarks />
      </section>

      {process.env.SHOW_LIQUIDITY_POOLS === 'true' && (
        <SectionQueryResult
          title="Highest Liquidity Pools"
          query={queryHighest}
        />
      )}

      <SectionQueryResult
        title="New Data Sets"
        query={queryLatest}
        action={
          <Button style="text" to="/search">
            All data sets →
          </Button>
        }
      />
    </>
  )
}
